export type RoutingErrorCode =
  | "ROUTER_INVALID_CONFIGURATION"
  | "ROUTER_INSUFFICIENT_PROVIDERS"
  | "ROUTER_DUPLICATE_PROVIDER"
  | "ROUTER_DUPLICATE_RULE";

/** Invalid routing input, never an ordinary lack of eligible providers. */
export class RoutingError extends Error {
  readonly code: RoutingErrorCode;

  constructor(code: RoutingErrorCode, message: string) {
    super(message);
    this.name = "RoutingError";
    this.code = code;
  }
}
