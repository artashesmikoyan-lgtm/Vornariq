import type { Agent, Task } from "../../src/core/contracts/index.js";
import type { ComparisonClock } from "../../src/comparison/index.js";

export const task = {
  schemaVersion: 1,
  id: "task-comparison-shared",
  objective: "Produce comparison evidence.",
  input: { nested: { safe: true } },
  createdAt: "2026-10-04T12:00:00.000Z",
} satisfies Task;

export const agent = {
  schemaVersion: 1,
  id: "agent-comparison-shared",
  name: "Shared Comparison Agent",
  description: "Runs deterministic provider comparisons.",
  capabilities: ["testing"],
} satisfies Agent;

export class IncrementingComparisonClock implements ComparisonClock {
  #offset = 0;

  now(): Date {
    const value = new Date(Date.UTC(2026, 9, 4, 12, 0, this.#offset));
    this.#offset += 1;
    return value;
  }
}
