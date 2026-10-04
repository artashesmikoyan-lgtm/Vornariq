import type { JsonObject } from "./json.js";

/** A stable identifier within the agent registry or owning scope. */
export type AgentId = string;

/** A portable capability identifier, including community-defined values. */
export type AgentCapability = string;

/** Describes a logical worker role, not a process or prompt. */
export interface Agent {
  readonly schemaVersion: 1;
  readonly id: AgentId;
  readonly name: string;
  readonly description: string;
  readonly capabilities: readonly AgentCapability[];
  readonly metadata?: JsonObject;
}
