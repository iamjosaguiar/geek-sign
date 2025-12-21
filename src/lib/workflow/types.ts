// Workflow engine type definitions

export type WorkflowStatus = "active" | "inactive" | "deleted";
export type ExecutionStatus = "pending" | "running" | "completed" | "failed";
export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";
export type StepType =
  | "send_document"
  | "await_signature"
  | "approval_gate"
  | "conditional_branch"
  | "parallel"
  | "wait";

export type ApprovalMode = "any" | "all" | "majority";

// Workflow definition structures
export interface WorkflowDefinition {
  version: string;
  steps: WorkflowStep[];
  variables?: Record<string, any>;
}

export interface WorkflowStep {
  id: string;
  type: StepType;
  name: string;
  config: StepConfig;
  onSuccess?: string; // Next step ID
  onFailure?: string; // Fallback step ID
}

export type StepConfig =
  | SendDocumentConfig
  | AwaitSignatureConfig
  | ApprovalGateConfig
  | ConditionalBranchConfig
  | ParallelConfig
  | WaitConfig;

export interface SendDocumentConfig {
  recipientEmail: string;
  recipientName?: string;
  customMessage?: string;
  template?: string;
}

export interface AwaitSignatureConfig {
  recipientId: string;
  timeout?: number; // milliseconds
  reminderInterval?: number; // milliseconds
}

export interface ApprovalGateConfig {
  approvers: string[]; // User IDs or emails
  mode: ApprovalMode;
  timeout?: number;
  escalationUserId?: string;
}

export interface ConditionalBranchConfig {
  condition: string; // Expression to evaluate
  thenStep: string; // Step ID if true
  elseStep?: string; // Step ID if false
}

export interface ParallelConfig {
  steps: string[]; // Step IDs to execute in parallel
  waitForAll: boolean;
}

export interface WaitConfig {
  duration: number; // milliseconds
  until?: string; // ISO date string or condition
}

// Execution context
export interface ExecutionContext {
  variables: Record<string, any>;
  documentId: string;
  workflowId: string;
  userId: string;
  metadata?: Record<string, any>;
}

// Step execution result
export interface StepResult {
  success: boolean;
  data?: any;
  error?: string;
  nextStepId?: string;
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number;
  backoffMultiplier: number; // Exponential backoff multiplier
  initialDelay: number; // milliseconds
}

// Event types
export type WorkflowEvent =
  | "workflow.started"
  | "workflow.completed"
  | "workflow.failed"
  | "step.started"
  | "step.completed"
  | "step.failed"
  | "approval.requested"
  | "approval.approved"
  | "approval.rejected"
  | "document.signed"
  | "timeout.reached";

export interface WorkflowEventPayload {
  event: WorkflowEvent;
  executionId: string;
  stepId?: string;
  timestamp: Date;
  data?: any;
}
