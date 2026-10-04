import type {
  ConsideredProvider,
  RoutingDecision,
  RoutingPolicy,
  RoutingRejectionReason,
  RoutingRequest,
  RoutingSelectionSource,
} from "./router-types.js";
import { validateRouting } from "./router-validation.js";

/** Pure selection above core contracts. Never executes or configures adapters. */
export class RuleBasedRouter {
  route(request: RoutingRequest, policy: RoutingPolicy): RoutingDecision {
    validateRouting(request, policy);
    const considered: ConsideredProvider[] = request.candidates.map(
      (candidate) => {
        const rejectionReasons: RoutingRejectionReason[] = [];
        if (candidate.enabled === false)
          rejectionReasons.push({ code: "PROVIDER_DISABLED" });
        if (
          request.allowedProviderIds !== undefined &&
          !request.allowedProviderIds.includes(candidate.providerId)
        ) {
          rejectionReasons.push({ code: "PROVIDER_NOT_ALLOWED" });
        }
        if (request.excludedProviderIds?.includes(candidate.providerId)) {
          rejectionReasons.push({ code: "PROVIDER_EXCLUDED" });
        }
        for (const capability of request.requiredCapabilities) {
          if (!candidate.capabilities.includes(capability)) {
            rejectionReasons.push({
              code: "MISSING_REQUIRED_CAPABILITY",
              capability,
            });
          }
        }
        return {
          providerId: candidate.providerId,
          eligible: rejectionReasons.length === 0,
          selected: false,
          rejectionReasons,
        };
      },
    );
    const eligibleIds = new Set(
      considered
        .filter((candidate) => candidate.eligible)
        .map((candidate) => candidate.providerId),
    );
    const matchedRule = policy.rules.find((rule) =>
      rule.when.requiredCapabilitiesAll.every((capability) =>
        request.requiredCapabilities.includes(capability),
      ),
    );
    const base = {
      schemaVersion: 1 as const,
      id: request.id,
      taskId: request.task.id,
      agentId: request.agent.id,
      createdAt: request.createdAt,
      requiredCapabilities: [...request.requiredCapabilities],
      ...(matchedRule === undefined ? {} : { matchedRuleId: matchedRule.id }),
    };
    const priorities: readonly (readonly [
      RoutingSelectionSource,
      readonly string[],
    ])[] = [
      ["rule", matchedRule?.preferProviders ?? []],
      ["request-preference", request.preferredProviderIds ?? []],
      ["policy-default", policy.defaultProviderOrder ?? []],
      ["candidate-order", considered.map((candidate) => candidate.providerId)],
    ];
    for (const [selectionSource, order] of priorities) {
      const selectedProviderId = order.find((id) => eligibleIds.has(id));
      if (selectedProviderId !== undefined) {
        return {
          ...base,
          status: "selected",
          selectedProviderId,
          selectionSource,
          consideredProviders: considered.map((candidate) => ({
            ...candidate,
            selected: candidate.providerId === selectedProviderId,
          })),
        };
      }
    }
    return { ...base, status: "unroutable", consideredProviders: considered };
  }
}
