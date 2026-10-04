import type { Agent, Task } from "../../../src/core/contracts/index.js";
import {
  geminiProvider,
  GeminiProviderAdapter,
} from "../../../src/providers/gemini/index.js";
import { providerConformanceSuite } from "../../conformance/provider-conformance.js";
import {
  FakeGeminiClock,
  FakeGeminiProcessRunner,
  readFixture,
  workingDirectory,
} from "./test-support.js";

const conformanceTask = {
  schemaVersion: 1,
  id: "task-test-001",
  title: "Exercise provider conformance",
  objective: "Return a deterministic provider result.",
  input: {
    nested: {
      values: [1, true, null, "portable"],
    },
  },
  constraints: ["Do not mutate this task."],
  createdAt: "2026-10-04T12:00:00.000Z",
} satisfies Task;

const conformanceAgent = {
  schemaVersion: 1,
  id: "agent-test-001",
  name: "Conformance Agent",
  description: "Exercises portable provider behavior.",
  capabilities: ["testing"],
  metadata: {
    nested: { enabled: true },
  },
} satisfies Agent;

providerConformanceSuite({
  name: "Gemini CLI",
  provider: geminiProvider,
  task: conformanceTask,
  agent: conformanceAgent,
  createSuccessAdapter: () =>
    new GeminiProviderAdapter({
      workingDirectory,
      processRunner: new FakeGeminiProcessRunner({
        stdout: readFixture("successful-run.jsonl"),
      }),
      clock: new FakeGeminiClock(),
    }),
  createFailureAdapter: ({ sensitiveDiagnostics }) =>
    new GeminiProviderAdapter({
      workingDirectory,
      processRunner: new FakeGeminiProcessRunner({
        error: new Error(sensitiveDiagnostics.join(" ")),
      }),
      clock: new FakeGeminiClock(),
    }),
});
