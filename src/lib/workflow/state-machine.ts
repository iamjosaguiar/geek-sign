// Workflow state machine
import { ExecutionStatus, StepStatus } from "./types";

export interface StateTransition {
  from: ExecutionStatus | StepStatus;
  to: ExecutionStatus | StepStatus;
  event: string;
  guard?: () => boolean;
}

// Workflow execution state transitions
export const EXECUTION_TRANSITIONS: StateTransition[] = [
  { from: "pending", to: "running", event: "start" },
  { from: "running", to: "completed", event: "complete" },
  { from: "running", to: "failed", event: "fail" },
  { from: "failed", to: "running", event: "retry" },
];

// Step execution state transitions
export const STEP_TRANSITIONS: StateTransition[] = [
  { from: "pending", to: "running", event: "start" },
  { from: "running", to: "completed", event: "complete" },
  { from: "running", to: "failed", event: "fail" },
  { from: "running", to: "skipped", event: "skip" },
  { from: "failed", to: "running", event: "retry" },
];

export class StateMachine<T extends string> {
  private currentState: T;
  private transitions: StateTransition[];

  constructor(initialState: T, transitions: StateTransition[]) {
    this.currentState = initialState;
    this.transitions = transitions;
  }

  getCurrentState(): T {
    return this.currentState;
  }

  canTransition(event: string): boolean {
    return this.transitions.some(
      (t) =>
        t.from === this.currentState &&
        t.event === event &&
        (!t.guard || t.guard())
    );
  }

  transition(event: string): boolean {
    const validTransition = this.transitions.find(
      (t) =>
        t.from === this.currentState &&
        t.event === event &&
        (!t.guard || t.guard())
    );

    if (validTransition) {
      this.currentState = validTransition.to as T;
      return true;
    }

    return false;
  }

  reset(state: T): void {
    this.currentState = state;
  }
}

export class ExecutionStateMachine extends StateMachine<ExecutionStatus> {
  constructor(initialState: ExecutionStatus = "pending") {
    super(initialState, EXECUTION_TRANSITIONS);
  }
}

export class StepStateMachine extends StateMachine<StepStatus> {
  constructor(initialState: StepStatus = "pending") {
    super(initialState, STEP_TRANSITIONS);
  }
}
