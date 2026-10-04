import { CodexProviderAdapter } from "../providers/codex/index.js";
import { GeminiProviderAdapter } from "../providers/gemini/index.js";
import type { RoutingCandidate } from "../router/index.js";
import type { RunOptions } from "./cli-args.js";

/** Effective capabilities come from the same explicit options as construction. */
export function createCandidates(
  options: RunOptions,
  workingDirectory: string,
): readonly RoutingCandidate[] {
  return options.providers.map((providerId) => {
    const capabilities = [
      "text-output",
      "local-repository-read",
      "structured-execution-events",
    ];
    if (providerId === "codex") {
      if (options.codexWorkspaceWrite)
        capabilities.push("local-repository-write");
      return {
        providerId,
        capabilities,
        adapter: new CodexProviderAdapter({
          workingDirectory,
          sandbox: options.codexWorkspaceWrite
            ? "workspace-write"
            : "read-only",
        }),
      };
    }
    return {
      providerId,
      capabilities,
      adapter: new GeminiProviderAdapter({ workingDirectory }),
    };
  });
}
