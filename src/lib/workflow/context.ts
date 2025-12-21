// Workflow execution context manager
import { ExecutionContext } from "./types";

export class WorkflowContext {
  private context: ExecutionContext;

  constructor(
    workflowId: string,
    documentId: string,
    userId: string,
    initialVariables: Record<string, any> = {}
  ) {
    this.context = {
      workflowId,
      documentId,
      userId,
      variables: { ...initialVariables },
      metadata: {},
    };
  }

  // Get a variable value
  get(key: string): any {
    return this.context.variables[key];
  }

  // Set a variable value
  set(key: string, value: any): void {
    this.context.variables[key] = value;
  }

  // Check if variable exists
  has(key: string): boolean {
    return key in this.context.variables;
  }

  // Delete a variable
  delete(key: string): void {
    delete this.context.variables[key];
  }

  // Get all variables
  getAll(): Record<string, any> {
    return { ...this.context.variables };
  }

  // Set multiple variables
  setMany(variables: Record<string, any>): void {
    this.context.variables = { ...this.context.variables, ...variables };
  }

  // Get metadata
  getMetadata(key: string): any {
    return this.context.metadata?.[key];
  }

  // Set metadata
  setMetadata(key: string, value: any): void {
    if (!this.context.metadata) {
      this.context.metadata = {};
    }
    this.context.metadata[key] = value;
  }

  // Get full context (for persistence)
  toJSON(): ExecutionContext {
    return {
      ...this.context,
      variables: { ...this.context.variables },
      metadata: { ...this.context.metadata },
    };
  }

  // Restore context from JSON
  static fromJSON(data: ExecutionContext): WorkflowContext {
    const ctx = new WorkflowContext(
      data.workflowId,
      data.documentId,
      data.userId,
      data.variables
    );
    if (data.metadata) {
      ctx.context.metadata = { ...data.metadata };
    }
    return ctx;
  }

  // Evaluate expression in context
  // Simple dot notation support (e.g., "document.value", "user.email")
  evaluate(expression: string): any {
    const parts = expression.split(".");
    let value: any = this.context.variables;

    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }
}
