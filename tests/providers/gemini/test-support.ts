import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type {
  Agent,
  ProviderExecutionRequest,
  Task,
} from "../../../src/core/contracts/index.js";
import type {
  GeminiClock,
  GeminiProcessRequest,
  GeminiProcessResult,
  GeminiProcessRunner,
} from "../../../src/providers/gemini/index.js";

export const workingDirectory = resolve("tests/fixtures/gemini");

export const task = {
  schemaVersion: 1,
  id: "task-gemini-001",
  title: "Verify the Gemini adapter",
  objective: "Return a deterministic read-only result.",
  input: {
    zebra: 2,
    alpha: { enabled: true },
  },
  constraints: ["Do not modify files.", "Do not use mutation commands."],
  createdAt: "2026-10-04T12:00:00.000Z",
} satisfies Task;

export const agent = {
  schemaVersion: 1,
  id: "agent-gemini-001",
  name: "Gemini Test Agent",
  description: "Executes a deterministic read-only adapter test.",
  capabilities: ["testing", "analysis"],
} satisfies Agent;

export const executionRequest = {
  schemaVersion: 1,
  executionId: "execution-gemini-001",
  task,
  agent,
} satisfies ProviderExecutionRequest;

export function readFixture(name: string): string {
  return readFileSync(
    new URL(`../../fixtures/gemini/${name}`, import.meta.url),
    "utf8",
  );
}

export class FakeGeminiProcessRunner implements GeminiProcessRunner {
  readonly requests: GeminiProcessRequest[] = [];
  readonly #stdout: string;
  readonly #result: GeminiProcessResult;
  readonly #error: Error | undefined;

  constructor(options?: {
    readonly stdout?: string;
    readonly result?: Partial<GeminiProcessResult>;
    readonly error?: Error;
  }) {
    this.#stdout = options?.stdout ?? "";
    this.#result = {
      exitCode: options?.result?.exitCode ?? 0,
      signal: options?.result?.signal ?? null,
      stderr: options?.result?.stderr ?? "",
      stderrTruncated: options?.result?.stderrTruncated ?? false,
    };
    this.#error = options?.error;
  }

  run(request: GeminiProcessRequest): Promise<GeminiProcessResult> {
    this.requests.push(request);

    if (this.#error !== undefined) {
      return Promise.reject(this.#error);
    }

    for (const line of this.#stdout.split(/\r?\n/)) {
      if (line.length > 0) {
        request.onStdoutLine(line);
      }
    }

    return Promise.resolve(this.#result);
  }
}

export class FakeGeminiClock implements GeminiClock {
  readonly #times = [
    new Date("2026-10-04T12:00:00.000Z"),
    new Date("2026-10-04T12:00:02.000Z"),
  ];
  readonly #monotonicTimes = [1000, 2500];

  now(): Date {
    const value = this.#times.shift();
    if (value === undefined) {
      throw new Error("Fake clock exhausted wall-clock values.");
    }
    return value;
  }

  monotonicNow(): number {
    const value = this.#monotonicTimes.shift();
    if (value === undefined) {
      throw new Error("Fake clock exhausted monotonic values.");
    }
    return value;
  }
}
