import type { RouteAndExecuteResult } from "../orchestration/index.js";

export const help = `Usage: vornariq run <objective> [options]
       vornariq --help
       vornariq --version
       vornariq run --help
       vornariq doctor [--json] [--live codex|gemini]

doctor: free local diagnostics by default. --live explicitly consumes provider resources.
See vornariq doctor --help.

--require <capability>       Repeatable explicit requirement; text-output is always included.
--providers <list>           Ordered codex,gemini list; default: codex (pre-release).
--cwd <path>                 Existing workspace directory; default: current directory.
--codex-workspace-write      Explicitly allow Codex to modify files in the selected workspace.
--json                      Print only the durable orchestration result to stdout.
--help                      Show this help.
--version                   Show the package version.

Codex defaults to read-only. Requiring local-repository-write does NOT grant
write permission; --codex-workspace-write is also required. Gemini is read-only
and opt-in pending live compatibility validation. No fallback or retries.
Quote the objective; use -- before an objective beginning with a dash.
Only --require is repeatable; duplicate capabilities are deduplicated.
Exit codes: 0 success, 1 configuration/infrastructure error, 2 unroutable,
3 provider did not succeed (failed, cancelled, or incomplete).
`;

export function resultExitCode(result: RouteAndExecuteResult): number {
  if (result.status === "unroutable") return 2;
  return result.executionResult.status === "succeeded" ? 0 : 3;
}

export function humanOutput(result: RouteAndExecuteResult): string {
  if (result.status === "unroutable") {
    return (
      "No eligible provider could satisfy the routing requirements.\n" +
      result.routingDecision.consideredProviders
        .map(
          (provider) =>
            `${provider.providerId}: ${provider.rejectionReasons.map((reason) => (reason.code === "MISSING_REQUIRED_CAPABILITY" ? `${reason.code}: ${reason.capability}` : reason.code)).join(", ")}`,
        )
        .join("\n") +
      "\n"
    );
  }
  const execution = result.executionResult;
  const header = `Provider: ${result.routingDecision.selectedProviderId}\n\n`;
  if (execution.status === "failed")
    return `${header}${execution.error.code}: ${execution.error.message}\n`;
  if (execution.status !== "succeeded")
    return `${header}Execution did not succeed (${execution.status}).\n`;
  const output = execution.output;
  const message =
    typeof output === "string"
      ? output
      : output !== null &&
          typeof output === "object" &&
          !Array.isArray(output) &&
          "message" in output &&
          typeof output.message === "string"
        ? output.message
        : JSON.stringify(output);
  return `${header}${message}\n`;
}
