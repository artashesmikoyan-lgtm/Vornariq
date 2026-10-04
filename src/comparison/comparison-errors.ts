export type ComparisonErrorCode =
  | "COMPARISON_INSUFFICIENT_PROVIDERS"
  | "COMPARISON_DUPLICATE_PROVIDER"
  | "COMPARISON_INVALID_CONFIGURATION";

/** A deterministic comparison infrastructure/configuration failure. */
export class ComparisonError extends Error {
  readonly code: ComparisonErrorCode;

  constructor(code: ComparisonErrorCode, message: string) {
    super(message);
    this.name = "ComparisonError";
    this.code = code;
  }
}
