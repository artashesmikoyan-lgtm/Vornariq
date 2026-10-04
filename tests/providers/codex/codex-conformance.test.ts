import type { Agent, Task } from "../../../src/core/contracts/index.js";
import {
  codexProvider,
  CodexProviderAdapter,
} from "../../../src/providers/codex/index.js";
import { providerConformanceSuite } from "../../conformance/provider-conformance.js";
import {
  FakeCodexClock,
  FakeCodexProcessRunner,
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
  name: "Codex CLI",
  provider: codexProvider,
  task: conformanceTask,
  agent: conformanceAgent,
  createSuccessAdapter: () =>
    new CodexProviderAdapter({
      workingDirectory,
      processRunner: new FakeCodexProcessRunner({
        stdout: readFixture("successful-run.jsonl"),
      }),
      clock: new FakeCodexClock(),
    }),
  createFailureAdapter: ({ sensitiveDiagnostics }) =>
    new CodexProviderAdapter({
      workingDirectory,
      processRunner: new FakeCodexProcessRunner({
        error: new Error(sensitiveDiagnostics.join(" ")),
      }),
      clock: new FakeCodexClock(),
    }),
});
