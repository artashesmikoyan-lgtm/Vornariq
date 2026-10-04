import type { Agent, ProviderAdapter, Task } from "../core/contracts/index.js";

/** Runtime-only adapter plus caller-declared effective capabilities. */
export interface RoutingCandidate {
  readonly providerId: string;
  readonly adapter: ProviderAdapter;
  readonly capabilities: readonly string[];
  readonly enabled?: boolean;
}

export interface RoutingRule {
  readonly id: string;
  readonly when: { readonly requiredCapabilitiesAll: readonly string[] };
  readonly preferProviders: readonly string[];
}

export interface RoutingPolicy {
  readonly schemaVersion: 1;
  readonly rules: readonly RoutingRule[];
  readonly defaultProviderOrder?: readonly string[];
}

export interface RoutingRequest {
  readonly schemaVersion: 1;
  readonly id: string;
  /** Caller-supplied normalized UTC timestamp; routing never reads a clock. */
  readonly createdAt: string;
  readonly task: Task;
  readonly agent: Agent;
  readonly candidates: readonly RoutingCandidate[];
  readonly requiredCapabilities: readonly string[];
  readonly allowedProviderIds?: readonly string[];
  readonly excludedProviderIds?: readonly string[];
  readonly preferredProviderIds?: readonly string[];
}

export type RoutingRejectionReason =
  | { readonly code: "PROVIDER_DISABLED" }
  | { readonly code: "PROVIDER_NOT_ALLOWED" }
  | { readonly code: "PROVIDER_EXCLUDED" }
  | {
      readonly code: "MISSING_REQUIRED_CAPABILITY";
      readonly capability: string;
    };

export interface ConsideredProvider {
  readonly providerId: string;
  readonly eligible: boolean;
  readonly selected: boolean;
  readonly rejectionReasons: readonly RoutingRejectionReason[];
}

export type RoutingSelectionSource =
  "rule" | "request-preference" | "policy-default" | "candidate-order";

interface RoutingDecisionBase {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly taskId: string;
  readonly agentId: string;
  readonly createdAt: string;
  readonly requiredCapabilities: readonly string[];
  readonly matchedRuleId?: string;
  readonly consideredProviders: readonly ConsideredProvider[];
}

/** Durable routing facts only; adapters and Task/Agent payloads are excluded. */
export type RoutingDecision = RoutingDecisionBase &
  (
    | {
        readonly status: "selected";
        readonly selectedProviderId: string;
        readonly selectionSource: RoutingSelectionSource;
      }
    | { readonly status: "unroutable" }
  );
