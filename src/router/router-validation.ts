import { RoutingError } from "./router-errors.js";

function requireValid(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new RoutingError("ROUTER_INVALID_CONFIGURATION", message);
  }
}

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function record(value: unknown): Record<string, unknown> {
  requireValid(
    value !== null && typeof value === "object" && !Array.isArray(value),
    "Routing configuration must be an object.",
  );
  return value as Record<string, unknown>;
}

function isList(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

function validateList(value: unknown): asserts value is readonly string[] {
  requireValid(
    isList(value) && Array.from(value).every(isIdentifier),
    "Routing lists must contain non-empty strings.",
  );
  requireValid(
    new Set(value).size === value.length,
    "Routing lists must be unique.",
  );
}

export function validateRouting(
  requestValue: unknown,
  policyValue: unknown,
): void {
  const request = record(requestValue);
  const policy = record(policyValue);
  requireValid(
    request.schemaVersion === 1,
    "Unsupported routing request version.",
  );
  requireValid(
    isIdentifier(request.id),
    "Routing request id must not be empty.",
  );
  requireValid(
    isIdentifier(record(request.task).id) &&
      isIdentifier(record(request.agent).id),
    "Routing requires Task and Agent ids.",
  );
  requireValid(
    typeof request.createdAt === "string" &&
      Number.isFinite(Date.parse(request.createdAt)) &&
      new Date(request.createdAt).toISOString() === request.createdAt,
    "Routing createdAt must be a normalized ISO UTC timestamp.",
  );
  validateList(request.requiredCapabilities);
  for (const list of [
    request.allowedProviderIds,
    request.excludedProviderIds,
    request.preferredProviderIds,
  ]) {
    if (list !== undefined) validateList(list);
  }
  requireValid(
    isList(request.candidates),
    "Routing candidates must be an array.",
  );
  if (request.candidates.length === 0) {
    throw new RoutingError(
      "ROUTER_INSUFFICIENT_PROVIDERS",
      "Routing requires at least one candidate.",
    );
  }
  const providerIds = new Set<string>();
  for (const candidateValue of request.candidates) {
    const candidate = record(candidateValue);
    requireValid(
      isIdentifier(candidate.providerId),
      "Candidate provider id must not be empty.",
    );
    if (providerIds.has(candidate.providerId)) {
      throw new RoutingError(
        "ROUTER_DUPLICATE_PROVIDER",
        "Candidate provider ids must be unique.",
      );
    }
    providerIds.add(candidate.providerId);
    const adapter = record(candidate.adapter);
    requireValid(
      record(adapter.provider).id === candidate.providerId &&
        typeof adapter.execute === "function",
      "Candidate id must match its provider adapter.",
    );
    requireValid(
      candidate.enabled === undefined || typeof candidate.enabled === "boolean",
      "Candidate enabled must be boolean.",
    );
    validateList(candidate.capabilities);
  }

  requireValid(
    policy.schemaVersion === 1 && isList(policy.rules),
    "Invalid routing policy.",
  );
  const ruleIds = new Set<string>();
  for (const ruleValue of policy.rules) {
    const rule = record(ruleValue);
    requireValid(isIdentifier(rule.id), "Rule id must not be empty.");
    if (ruleIds.has(rule.id)) {
      throw new RoutingError(
        "ROUTER_DUPLICATE_RULE",
        "Rule ids must be unique.",
      );
    }
    ruleIds.add(rule.id);
    validateList(record(rule.when).requiredCapabilitiesAll);
    validateList(rule.preferProviders);
  }
  if (policy.defaultProviderOrder !== undefined)
    validateList(policy.defaultProviderOrder);
}
