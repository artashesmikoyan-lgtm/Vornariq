import type {
  Agent,
  ExecutionResult,
  ProviderAdapter,
  Task,
} from "../core/contracts/index.js";

/** Runtime-only participant. Adapters are never persisted in a report. */
export interface ComparisonParticipant {
  readonly adapter: ProviderAdapter;
}

/** Runtime input for one ordered, sequential multi-provider comparison. */
export interface ComparisonRequest {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly task: Task;
  readonly agent: Agent;
  readonly participants: readonly ComparisonParticipant[];
}

/** A comparison run is exactly one existing provider-neutral execution result. */
export type ComparisonRun = ExecutionResult;

/** Durable evidence from one comparison operation. Contains no ranking. */
export interface ComparisonReport {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly taskId: string;
  readonly agentId: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly runs: readonly ComparisonRun[];
}
