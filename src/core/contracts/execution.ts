import type { Iso8601UtcTimestamp, JsonObject, JsonValue } from "./json.js";

/** A stable identifier within the execution's owning scope. */
export type ExecutionId = string;

export type ExecutionStatus =
  "pending" | "running" | "succeeded" | "failed" | "cancelled";

/** Decimal amount plus an ISO 4217 currency code, without floating-point money. */
export interface MonetaryAmount {
  readonly amount: string;
  readonly currency: string;
}

/** Portable metrics. Every value is optional because providers expose different data. */
export interface ExecutionMetrics {
  readonly durationMs?: number;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
  readonly estimatedCost?: MonetaryAmount;
}

/** Provider-neutral failure information. Stack traces are intentionally excluded. */
export interface ExecutionError {
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly details?: JsonObject;
}

interface ExecutionResultBase {
  readonly schemaVersion: 1;
  readonly id: ExecutionId;
  readonly taskId: string;
  readonly agentId: string;
  readonly providerId: string;
  readonly status: ExecutionStatus;
  readonly createdAt: Iso8601UtcTimestamp;
  readonly startedAt?: Iso8601UtcTimestamp;
  readonly completedAt?: Iso8601UtcTimestamp;
  readonly metrics?: ExecutionMetrics;
  readonly metadata?: JsonObject;
}

export interface PendingExecutionResult extends ExecutionResultBase {
  readonly status: "pending";
}

export interface RunningExecutionResult extends ExecutionResultBase {
  readonly status: "running";
  readonly startedAt: Iso8601UtcTimestamp;
}

export interface SucceededExecutionResult extends ExecutionResultBase {
  readonly status: "succeeded";
  readonly startedAt: Iso8601UtcTimestamp;
  readonly completedAt: Iso8601UtcTimestamp;
  readonly output: JsonValue;
}

export interface FailedExecutionResult extends ExecutionResultBase {
  readonly status: "failed";
  readonly completedAt: Iso8601UtcTimestamp;
  readonly error: ExecutionError;
}

export interface CancelledExecutionResult extends ExecutionResultBase {
  readonly status: "cancelled";
  readonly completedAt: Iso8601UtcTimestamp;
  readonly reason?: string;
}

/** The durable state of one execution attempt. */
export type ExecutionResult =
  | PendingExecutionResult
  | RunningExecutionResult
  | SucceededExecutionResult
  | FailedExecutionResult
  | CancelledExecutionResult;
