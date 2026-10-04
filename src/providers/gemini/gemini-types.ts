import type { Provider } from "../../core/contracts/index.js";

export const geminiProvider = {
  schemaVersion: 1,
  id: "gemini",
  displayName: "Google Gemini CLI",
  capabilities: [
    "text-output",
    "local-repository-read",
    "structured-execution-events",
  ],
  metadata: {
    transport: "gemini-cli-stream-json",
    access: "read-only",
  },
} as const satisfies Provider;

export interface GeminiUsage {
  readonly inputTokens?: number;
  readonly outputTokens?: number;
  readonly totalTokens?: number;
}

export interface GeminiStreamFailure {
  readonly kind: "error_event" | "result_error";
  readonly code?: string;
  readonly message?: string;
}

export interface GeminiParsedRun {
  readonly sessionId?: string;
  readonly model?: string;
  readonly finalMessage?: string;
  readonly usage?: GeminiUsage;
  readonly terminalStatus?: "success" | "error";
  readonly failure?: GeminiStreamFailure;
  readonly warningCount: number;
}
