import type { Iso8601UtcTimestamp, JsonObject } from "./json.js";

/** A stable identifier within the task's owning scope. */
export type TaskId = string;

/** Describes requested work without selecting an agent, model, or provider. */
export interface Task {
  readonly schemaVersion: 1;
  readonly id: TaskId;
  readonly objective: string;
  readonly title?: string;
  readonly input?: JsonObject;
  readonly constraints?: readonly string[];
  readonly createdAt: Iso8601UtcTimestamp;
}
