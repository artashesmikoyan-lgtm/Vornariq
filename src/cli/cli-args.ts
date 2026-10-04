export class CliError extends Error {}

export type CliProviderId = "codex" | "gemini";

export interface RunOptions {
  readonly objective: string;
  readonly requiredCapabilities: readonly string[];
  readonly providers: readonly CliProviderId[];
  readonly cwd?: string;
  readonly codexWorkspaceWrite: boolean;
  readonly json: boolean;
}

export type CliCommand =
  | { readonly command: "help" }
  | { readonly command: "version" }
  | { readonly command: "doctor-help" }
  | {
      readonly command: "doctor";
      readonly json: boolean;
      readonly live?: CliProviderId;
    }
  | { readonly command: "run"; readonly options: RunOptions };

export function parseArgs(args: readonly string[]): CliCommand {
  if (args[0] === "doctor") {
    if (args.length === 2 && args[1] === "--help")
      return { command: "doctor-help" };
    let json = false;
    let live: CliProviderId | undefined;
    for (let index = 1; index < args.length; index += 1) {
      if (args[index] === "--json" && !json) {
        json = true;
        continue;
      }
      if (args[index] === "--live" && live === undefined) {
        const provider = args[++index];
        if (provider !== "codex" && provider !== "gemini")
          throw new CliError("--live requires codex or gemini.");
        live = provider;
        continue;
      }
      throw new CliError("Invalid doctor option. See doctor --help.");
    }
    return { command: "doctor", json, ...(live === undefined ? {} : { live }) };
  }
  if (
    (args.length === 1 && args[0] === "--help") ||
    (args.length === 2 && args[0] === "run" && args[1] === "--help")
  )
    return { command: "help" };
  if (args.length === 1 && args[0] === "--version")
    return { command: "version" };
  if (args[0] !== "run")
    throw new CliError("Expected run <objective>, --help, or --version.");
  let objective: string | undefined;
  let cwd: string | undefined;
  let providers: CliProviderId[] = ["codex"];
  const required = new Set(["text-output"]);
  const seen = new Set<string>();
  let literal = false;
  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === undefined) continue;
    if (!literal && arg === "--") {
      literal = true;
      continue;
    }
    if (!literal && arg.startsWith("-")) {
      if (
        ![
          "--require",
          "--providers",
          "--cwd",
          "--codex-workspace-write",
          "--json",
        ].includes(arg)
      )
        throw new CliError("Unknown option. See --help.");
      if (arg !== "--require" && seen.has(arg))
        throw new CliError("Only --require may be repeated.");
      seen.add(arg);
      if (arg === "--json" || arg === "--codex-workspace-write") continue;
      const value = args[++index];
      if (value === undefined || value.trim() === "" || value.startsWith("-"))
        throw new CliError("Option requires a non-empty value.");
      if (arg === "--require") required.add(value.trim());
      if (arg === "--cwd") cwd = value;
      if (arg === "--providers") {
        const ids = value.split(",").map((id) => id.trim());
        if (
          !ids.every(
            (id): id is CliProviderId => id === "codex" || id === "gemini",
          )
        )
          throw new CliError("Providers must be codex or gemini.");
        if (new Set(ids).size !== ids.length)
          throw new CliError("Duplicate providers are not allowed.");
        providers = ids;
      }
    } else {
      if (objective !== undefined)
        throw new CliError("Supply exactly one quoted objective.");
      objective = arg;
    }
  }
  if (objective === undefined || objective.trim() === "")
    throw new CliError("A non-empty objective is required.");
  if (seen.has("--codex-workspace-write") && !providers.includes("codex"))
    throw new CliError(
      "--codex-workspace-write requires codex in --providers.",
    );
  return {
    command: "run",
    options: {
      objective,
      providers,
      requiredCapabilities: [...required],
      ...(cwd === undefined ? {} : { cwd }),
      codexWorkspaceWrite: seen.has("--codex-workspace-write"),
      json: seen.has("--json"),
    },
  };
}
