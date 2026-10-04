import type { Agent } from "./agent.js";
import type { ExecutionResult } from "./execution.js";
import type { JsonObject } from "./json.js";
import type { Task } from "./task.js";

/** A stable identifier within the provider registry or owning scope. */
export type ProviderId = string;

/** A portable provider feature identifier. */
export type ProviderCapability = string;

/** Provider identity and capabilities, separate from execution behavior. */
export interface Provider {
  readonly schemaVersion: 1;
  readonly id: ProviderId;
  readonly displayName: string;
  readonly capabilities: readonly ProviderCapability[];
  readonly metadata?: JsonObject;
}

/** Provider-neutral input supplied to a future provider adapter. */
export interface ProviderExecutionRequest {
  readonly schemaVersion: 1;
  readonly executionId: string;
  readonly task: Task;
  readonly agent: Agent;
}

/**
 * Behavioral boundary for future adapters. Implementations translate between
 * provider SDK values and these provider-neutral contracts.
 */
export interface ProviderAdapter {
  readonly provider: Provider;
  execute(request: ProviderExecutionRequest): Promise<ExecutionResult>;
}
