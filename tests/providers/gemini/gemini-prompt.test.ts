import { describe, expect, it } from "vitest";

import { buildGeminiPrompt } from "../../../src/providers/gemini/gemini-prompt.js";
import { agent, task } from "./test-support.js";

describe("Gemini prompt builder", () => {
  it("produces deterministic, canonical read-only prompt text", () => {
    const expected = `You are executing a read-only Vornariq task.

Agent:
Name: Gemini Test Agent
Description: Executes a deterministic read-only adapter test.
Capabilities:
- testing
- analysis

Objective:
Return a deterministic read-only result.

Title: Verify the Gemini adapter

Context:
{
  "alpha": {
    "enabled": true
  },
  "zebra": 2
}

Constraints:
- Do not modify files.
- Do not use mutation commands.

Read-only safety instructions:
- Inspect and analyze the workspace when useful.
- Do not modify repository files.
- Do not execute shell commands requiring mutation.
- Treat the CLI approval policy, not these instructions, as the security boundary.

Completion instruction:
Return the requested result as concise user-facing text.`;

    expect(buildGeminiPrompt(task, agent)).toBe(expected);
    expect(buildGeminiPrompt(task, agent)).toBe(buildGeminiPrompt(task, agent));
  });
});
