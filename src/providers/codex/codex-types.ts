import type { Provider } from "../../core/contracts/index.js";

export const codexProvider = {
  schemaVersion: 1,
  id: "codex",
  displayName: "OpenAI Codex CLI",
  capabilities: ["text-output", "local-repository"],
  metadata: {
    transport: "codex-exec-jsonl",
  },
} as const satisfies Provider;

export type CodexSandboxMode = "read-only" | "workspace-write";

export interface CodexUsage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}

export type CodexFailureKind = "turn_failed" | "error_event";

export interface CodexFailure {
  readonly kind: CodexFailureKind;
  readonly code?: string;
  readonly message?: string;
}

export interface CodexParsedRun {
  readonly threadId?: string;
  readonly finalMessage?: string;
  readonly usage?: CodexUsage;
  readonly turnCompleted: boolean;
  readonly failure?: CodexFailure;
}
