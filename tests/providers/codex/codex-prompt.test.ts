import { describe, expect, it } from "vitest";

import { buildCodexPrompt } from "../../../src/providers/codex/codex-prompt.js";
import { agent, task } from "./test-support.js";

describe("Codex prompt builder", () => {
  it("produces deterministic, canonical prompt text", () => {
    const expected = `You are executing a Vornariq task.

Agent:
Name: Test Agent
Description: Executes a deterministic adapter test.
Capabilities:
- testing
- implementation

Objective:
Return a deterministic result.

Title: Verify the adapter

Context:
{
  "alpha": {
    "enabled": true
  },
  "zebra": 2
}

Constraints:
- Do not modify files.
- Do not use the network.

Completion instruction:
Complete the requested work and return a concise final result.`;

    expect(buildCodexPrompt(task, agent)).toBe(expected);
    expect(buildCodexPrompt(task, agent)).toBe(buildCodexPrompt(task, agent));
  });
});
