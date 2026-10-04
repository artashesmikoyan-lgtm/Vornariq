import type { Iso8601UtcTimestamp, JsonObject } from "./json.js";

/** A stable identifier within the evaluation's owning scope. */
export type EvaluationId = string;

/** A portable evaluator identity; type is an open identifier such as `deterministic`. */
export interface Evaluator {
  readonly id: string;
  readonly type: string;
  readonly name?: string;
}

export type EvaluationOutcome = "passed" | "failed" | "inconclusive";

/** A score is meaningful only together with its declared range. */
export interface EvaluationScore {
  readonly value: number;
  readonly min: number;
  readonly max: number;
}

export type EvaluationFindingSeverity = "info" | "warning" | "error";

export interface EvaluationFinding {
  readonly code: string;
  readonly severity: EvaluationFindingSeverity;
  readonly message: string;
  readonly details?: JsonObject;
}

/** An assessment of an execution, separate from the execution itself. */
export interface EvaluationResult {
  readonly schemaVersion: 1;
  readonly id: EvaluationId;
  readonly executionId: string;
  readonly evaluator: Evaluator;
  readonly outcome: EvaluationOutcome;
  readonly score?: EvaluationScore;
  readonly findings: readonly EvaluationFinding[];
  readonly createdAt: Iso8601UtcTimestamp;
  readonly metadata?: JsonObject;
}
