/** Public identity metadata for the pre-alpha Vornariq package. */
export const project = {
  name: "Vornariq",
  packageName: "vornariq",
  version: "0.0.1",
  tagline: "Intelligent orchestration for coding agents.",
  status: "pre-alpha",
} as const;

export type ProjectMetadata = typeof project;

export { RoutingError, RuleBasedRouter } from "./router/index.js";
export type {
  ConsideredProvider,
  RoutingCandidate,
  RoutingDecision,
  RoutingErrorCode,
  RoutingPolicy,
  RoutingRejectionReason,
  RoutingRequest,
  RoutingRule,
  RoutingSelectionSource,
} from "./router/index.js";

export { ComparisonError, ComparisonRunner } from "./comparison/index.js";
export type {
  ComparisonErrorCode,
  ComparisonParticipant,
  ComparisonReport,
  ComparisonRequest,
  ComparisonRun,
} from "./comparison/index.js";

export type {
  Agent,
  AgentCapability,
  AgentId,
  CancelledExecutionResult,
  EvaluationFinding,
  EvaluationFindingSeverity,
  EvaluationId,
  EvaluationOutcome,
  EvaluationResult,
  EvaluationScore,
  Evaluator,
  ExecutionError,
  ExecutionId,
  ExecutionMetrics,
  ExecutionResult,
  ExecutionStatus,
  FailedExecutionResult,
  Iso8601UtcTimestamp,
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  MonetaryAmount,
  PendingExecutionResult,
  Provider,
  ProviderAdapter,
  ProviderCapability,
  ProviderExecutionRequest,
  ProviderId,
  RunningExecutionResult,
  SucceededExecutionResult,
  Task,
  TaskId,
} from "./core/contracts/index.js";

export {
  codexProvider,
  CodexProviderAdapter,
  NodeCodexProcessRunner,
} from "./providers/codex/index.js";
export type {
  CodexClock,
  CodexProcessRequest,
  CodexProcessResult,
  CodexProcessRunner,
  CodexProviderOptions,
  CodexSandboxMode,
} from "./providers/codex/index.js";

export {
  geminiProvider,
  GeminiProviderAdapter,
  NodeGeminiProcessRunner,
} from "./providers/gemini/index.js";
export type {
  GeminiClock,
  GeminiProcessRequest,
  GeminiProcessResult,
  GeminiProcessRunner,
  GeminiProviderOptions,
} from "./providers/gemini/index.js";
