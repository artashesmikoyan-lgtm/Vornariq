export type OrchestrationErrorCode =
  "ORCHESTRATION_SELECTED_PROVIDER_MISSING" | "ORCHESTRATION_INVALID_CLOCK";

/** Infrastructure failure, distinct from unroutable and provider failure data. */
export class OrchestrationError extends Error {
  readonly code: OrchestrationErrorCode;

  constructor(code: OrchestrationErrorCode, message: string) {
    super(message);
    this.name = "OrchestrationError";
    this.code = code;
  }
}
