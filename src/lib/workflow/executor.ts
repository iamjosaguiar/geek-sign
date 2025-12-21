// Workflow execution engine
import { db, workflows, workflowExecutions, workflowSteps } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import {
  WorkflowDefinition,
  WorkflowStep,
  ExecutionContext,
  StepResult,
  StepType,
  WorkflowEventPayload,
} from "./types";
import { WorkflowContext } from "./context";
import { ExecutionStateMachine, StepStateMachine } from "./state-machine";
import {
  RetryManager,
  StepExecutionError,
  ValidationError,
  TimeoutError,
} from "./retry";

export class WorkflowExecutor {
  private retryManager: RetryManager;
  private eventHandlers: Map<string, ((payload: WorkflowEventPayload) => void)[]>;

  constructor() {
    this.retryManager = new RetryManager();
    this.eventHandlers = new Map();
  }

  // Start workflow execution
  async startExecution(
    workflowId: string,
    documentId: string,
    userId: string,
    initialVariables: Record<string, any> = {}
  ): Promise<string> {
    // Load workflow definition
    const workflow = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId),
    });

    if (!workflow) {
      throw new ValidationError(`Workflow ${workflowId} not found`);
    }

    if (workflow.status !== "active") {
      throw new ValidationError(`Workflow ${workflowId} is not active`);
    }

    const definition = workflow.definition as WorkflowDefinition;

    // Validate definition
    this.validateDefinition(definition);

    // Create execution record
    const [execution] = await db
      .insert(workflowExecutions)
      .values({
        workflowId,
        documentId,
        status: "pending",
        context: initialVariables,
        currentStepIndex: 0,
        startedAt: new Date(),
      })
      .returning();

    // Emit started event
    this.emitEvent({
      event: "workflow.started",
      executionId: execution.id,
      timestamp: new Date(),
      data: { workflowId, documentId },
    });

    // Start executing steps asynchronously
    this.executeWorkflow(execution.id, definition, userId, initialVariables);

    return execution.id;
  }

  // Main workflow execution loop
  private async executeWorkflow(
    executionId: string,
    definition: WorkflowDefinition,
    userId: string,
    initialVariables: Record<string, any>
  ): Promise<void> {
    const stateMachine = new ExecutionStateMachine();

    // Update to running
    stateMachine.transition("start");
    await this.updateExecutionStatus(executionId, "running");

    // Get execution details
    const execution = await db.query.workflowExecutions.findFirst({
      where: eq(workflowExecutions.id, executionId),
    });

    if (!execution) {
      throw new ValidationError(`Execution ${executionId} not found`);
    }

    // Initialize context
    const context = new WorkflowContext(
      execution.workflowId,
      execution.documentId,
      userId,
      initialVariables
    );

    try {
      // Execute steps sequentially
      for (let i = 0; i < definition.steps.length; i++) {
        const step = definition.steps[i];

        // Update current step index
        await db
          .update(workflowExecutions)
          .set({ currentStepIndex: i })
          .where(eq(workflowExecutions.id, executionId));

        // Execute step
        const result = await this.executeStep(executionId, step, context);

        if (!result.success) {
          throw new StepExecutionError(
            result.error || "Step execution failed",
            step.id
          );
        }

        // Update context with step result
        if (result.data) {
          context.set(`step_${step.id}_result`, result.data);
        }

        // Handle conditional branching
        if (result.nextStepId) {
          const nextStepIndex = definition.steps.findIndex(
            (s) => s.id === result.nextStepId
          );
          if (nextStepIndex !== -1) {
            i = nextStepIndex - 1; // -1 because loop will increment
          }
        }
      }

      // Mark as completed
      stateMachine.transition("complete");
      await this.updateExecutionStatus(executionId, "completed", context);

      this.emitEvent({
        event: "workflow.completed",
        executionId,
        timestamp: new Date(),
      });
    } catch (error) {
      // Mark as failed
      stateMachine.transition("fail");
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await this.updateExecutionStatus(executionId, "failed", context, errorMessage);

      this.emitEvent({
        event: "workflow.failed",
        executionId,
        timestamp: new Date(),
        data: { error: errorMessage },
      });

      throw error;
    }
  }

  // Execute a single step
  private async executeStep(
    executionId: string,
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepResult> {
    const stateMachine = new StepStateMachine();

    // Create step record
    const [stepRecord] = await db
      .insert(workflowSteps)
      .values({
        executionId,
        stepIndex: parseInt(step.id.split("_")[1] || "0"),
        stepType: step.type,
        status: "pending",
      })
      .returning();

    this.emitEvent({
      event: "step.started",
      executionId,
      stepId: step.id,
      timestamp: new Date(),
      data: { stepType: step.type },
    });

    try {
      // Update to running
      stateMachine.transition("start");
      await db
        .update(workflowSteps)
        .set({ status: "running" })
        .where(eq(workflowSteps.id, stepRecord.id));

      // Execute step based on type
      const result = await this.executeStepByType(step, context);

      // Update to completed
      stateMachine.transition("complete");
      await db
        .update(workflowSteps)
        .set({
          status: "completed",
          result: result.data,
          completedAt: new Date(),
        })
        .where(eq(workflowSteps.id, stepRecord.id));

      this.emitEvent({
        event: "step.completed",
        executionId,
        stepId: step.id,
        timestamp: new Date(),
        data: result.data,
      });

      return result;
    } catch (error) {
      // Handle failure with retry
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      stateMachine.transition("fail");
      await db
        .update(workflowSteps)
        .set({
          status: "failed",
          errorMessage,
        })
        .where(eq(workflowSteps.id, stepRecord.id));

      this.emitEvent({
        event: "step.failed",
        executionId,
        stepId: step.id,
        timestamp: new Date(),
        data: { error: errorMessage },
      });

      throw error;
    }
  }

  // Execute step by type
  private async executeStepByType(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepResult> {
    switch (step.type) {
      case "send_document":
        return this.executeSendDocument(step, context);
      case "await_signature":
        return this.executeAwaitSignature(step, context);
      case "approval_gate":
        return this.executeApprovalGate(step, context);
      case "conditional_branch":
        return this.executeConditionalBranch(step, context);
      case "parallel":
        return this.executeParallel(step, context);
      case "wait":
        return this.executeWait(step, context);
      default:
        throw new StepExecutionError(
          `Unknown step type: ${step.type}`,
          step.id
        );
    }
  }

  // Step type implementations (stubs for now)
  private async executeSendDocument(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepResult> {
    // TODO: Implement send document logic
    return {
      success: true,
      data: { sent: true },
    };
  }

  private async executeAwaitSignature(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepResult> {
    // TODO: Implement await signature logic
    return {
      success: true,
      data: { signed: true },
    };
  }

  private async executeApprovalGate(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepResult> {
    // TODO: Implement approval gate logic
    return {
      success: true,
      data: { approved: true },
    };
  }

  private async executeConditionalBranch(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepResult> {
    const config = step.config as import("./types").ConditionalBranchConfig;

    // Import evaluator dynamically to avoid circular dependencies
    const { evaluateCondition } = await import("./expression-evaluator");

    // Evaluate the condition
    const conditionResult = evaluateCondition(config.condition, context);

    // Determine next step based on condition
    const nextStepId = conditionResult ? config.thenStep : config.elseStep;

    return {
      success: true,
      data: {
        condition: conditionResult,
        nextStep: nextStepId
      },
      nextStepId,
    };
  }

  private async executeParallel(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepResult> {
    // TODO: Implement parallel execution
    return {
      success: true,
      data: { parallelCompleted: true },
    };
  }

  private async executeWait(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepResult> {
    // TODO: Implement wait logic
    return {
      success: true,
      data: { waited: true },
    };
  }

  // Validate workflow definition
  private validateDefinition(definition: WorkflowDefinition): void {
    if (!definition.steps || definition.steps.length === 0) {
      throw new ValidationError("Workflow must have at least one step");
    }

    // Check for duplicate step IDs
    const stepIds = definition.steps.map((s) => s.id);
    const duplicates = stepIds.filter(
      (id, index) => stepIds.indexOf(id) !== index
    );
    if (duplicates.length > 0) {
      throw new ValidationError(
        `Duplicate step IDs found: ${duplicates.join(", ")}`
      );
    }

    // Validate step references
    for (const step of definition.steps) {
      if (step.onSuccess && !stepIds.includes(step.onSuccess)) {
        throw new ValidationError(
          `Step ${step.id} references unknown success step: ${step.onSuccess}`
        );
      }
      if (step.onFailure && !stepIds.includes(step.onFailure)) {
        throw new ValidationError(
          `Step ${step.id} references unknown failure step: ${step.onFailure}`
        );
      }
    }
  }

  // Update execution status
  private async updateExecutionStatus(
    executionId: string,
    status: "pending" | "running" | "completed" | "failed",
    context?: WorkflowContext,
    errorMessage?: string
  ): Promise<void> {
    const updates: any = { status };

    if (status === "completed") {
      updates.completedAt = new Date();
    }

    if (context) {
      updates.context = context.toJSON();
    }

    if (errorMessage) {
      updates.errorMessage = errorMessage;
    }

    await db
      .update(workflowExecutions)
      .set(updates)
      .where(eq(workflowExecutions.id, executionId));
  }

  // Event handling
  on(event: string, handler: (payload: WorkflowEventPayload) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  private emitEvent(payload: WorkflowEventPayload): void {
    const handlers = this.eventHandlers.get(payload.event) || [];
    handlers.forEach((handler) => handler(payload));
  }
}

// Singleton instance
export const workflowExecutor = new WorkflowExecutor();
