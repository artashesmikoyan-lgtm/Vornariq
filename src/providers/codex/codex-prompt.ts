import type {
  Agent,
  JsonObject,
  JsonValue,
  Task,
} from "../../core/contracts/index.js";

function canonicalizeJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, JsonValue> = {};

    for (const key of Object.keys(value).sort()) {
      const child = (value as JsonObject)[key];
      if (child !== undefined) {
        result[key] = canonicalizeJson(child);
      }
    }

    return result;
  }

  return value;
}

function stringifyContext(input: JsonObject | undefined): string {
  return input === undefined
    ? "None."
    : JSON.stringify(canonicalizeJson(input), null, 2);
}

function formatList(values: readonly string[]): string {
  return values.length === 0
    ? "- None."
    : values.map((value) => `- ${value}`).join("\n");
}

/** Builds the complete deterministic prompt delivered to Codex over stdin. */
export function buildCodexPrompt(task: Task, agent: Agent): string {
  const title = task.title === undefined ? [] : ["", `Title: ${task.title}`];

  return [
    "You are executing a Vornariq task.",
    "",
    "Agent:",
    `Name: ${agent.name}`,
    `Description: ${agent.description}`,
    "Capabilities:",
    formatList(agent.capabilities),
    "",
    "Objective:",
    task.objective,
    ...title,
    "",
    "Context:",
    stringifyContext(task.input),
    "",
    "Constraints:",
    formatList(task.constraints ?? []),
    "",
    "Completion instruction:",
    "Complete the requested work and return a concise final result.",
  ].join("\n");
}
