// Retry logic with exponential backoff
import { RetryConfig } from "./types";

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  backoffMultiplier: 2,
  initialDelay: 1000, // 1 second
};

export class RetryManager {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  // Calculate delay for retry attempt
  getDelay(attemptNumber: number): number {
    return (
      this.config.initialDelay *
      Math.pow(this.config.backoffMultiplier, attemptNumber - 1)
    );
  }

  // Check if should retry
  shouldRetry(attemptNumber: number, error: Error): boolean {
    if (attemptNumber >= this.config.maxAttempts) {
      return false;
    }

    // Check if error is retryable
    return this.isRetryableError(error);
  }

  // Determine if error is retryable
  private isRetryableError(error: Error): boolean {
    const retryableErrors = [
      "ECONNREFUSED",
      "ETIMEDOUT",
      "ENOTFOUND",
      "NetworkError",
      "TimeoutError",
    ];

    return retryableErrors.some(
      (errType) =>
        error.message.includes(errType) || error.name.includes(errType)
    );
  }

  // Execute function with retry
  async execute<T>(
    fn: () => Promise<T>,
    attemptNumber: number = 1
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (
        error instanceof Error &&
        this.shouldRetry(attemptNumber, error)
      ) {
        const delay = this.getDelay(attemptNumber);
        await this.sleep(delay);
        return this.execute(fn, attemptNumber + 1);
      }
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Workflow-specific errors
export class WorkflowError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "WorkflowError";
  }
}

export class StepExecutionError extends WorkflowError {
  constructor(
    message: string,
    public stepId: string,
    retryable: boolean = false
  ) {
    super(message, "STEP_EXECUTION_ERROR", retryable);
    this.name = "StepExecutionError";
  }
}

export class ValidationError extends WorkflowError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", false);
    this.name = "ValidationError";
  }
}

export class TimeoutError extends WorkflowError {
  constructor(message: string) {
    super(message, "TIMEOUT_ERROR", true);
    this.name = "TimeoutError";
  }
}

export class ApprovalError extends WorkflowError {
  constructor(message: string, retryable: boolean = false) {
    super(message, "APPROVAL_ERROR", retryable);
    this.name = "ApprovalError";
  }
}
