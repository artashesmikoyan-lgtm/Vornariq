import { randomUUID } from "node:crypto";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { project } from "../index.js";
import { RouteAndExecuteOrchestrator } from "../orchestration/index.js";
import { CliError, parseArgs } from "./cli-args.js";
import { help, humanOutput, resultExitCode } from "./cli-output.js";
import { createCandidates } from "./provider-factory.js";
import { diagnose, doctorHelp, doctorOutput } from "../doctor/doctor.js";

export interface CliDependencies {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
  readonly cwd: () => string;
  readonly createCandidates: typeof createCandidates;
  readonly diagnose: typeof diagnose;
}

const defaults: CliDependencies = {
  stdout: (text) => {
    process.stdout.write(text);
  },
  stderr: (text) => {
    process.stderr.write(text);
  },
  cwd: () => process.cwd(),
  createCandidates,
  diagnose,
};

/** No process exit here: the executable owns exitCode; tests inject IO/providers. */
export async function runCli(
  args: readonly string[],
  overrides: Partial<CliDependencies> = {},
): Promise<number> {
  const dependencies = { ...defaults, ...overrides };
  try {
    const command = parseArgs(args);
    if (command.command === "doctor-help") {
      dependencies.stdout(doctorHelp);
      return 0;
    }
    if (command.command === "doctor") {
      const { report, exitCode } = await dependencies.diagnose(
        dependencies.cwd(),
        command.live,
        { createCandidates: dependencies.createCandidates },
      );
      dependencies.stdout(
        command.json ? `${JSON.stringify(report)}\n` : doctorOutput(report),
      );
      return exitCode;
    }
    if (command.command === "help") {
      dependencies.stdout(help);
      return 0;
    }
    if (command.command === "version") {
      dependencies.stdout(`${project.version}\n`);
      return 0;
    }
    const { options } = command;
    const workingDirectory = resolve(dependencies.cwd(), options.cwd ?? ".");
    let isDirectory: boolean;
    try {
      isDirectory = (await stat(workingDirectory)).isDirectory();
    } catch {
      throw new CliError("Working directory must exist and be accessible.");
    }
    if (!isDirectory)
      throw new CliError("Working directory must be a directory.");
    const candidates = dependencies.createCandidates(options, workingDirectory);
    const createdAt = new Date().toISOString();
    const result = await new RouteAndExecuteOrchestrator().run({
      schemaVersion: 1,
      id: randomUUID(),
      createdAt,
      task: {
        schemaVersion: 1,
        id: randomUUID(),
        objective: options.objective,
        createdAt,
      },
      agent: {
        schemaVersion: 1,
        id: "cli-agent",
        name: "Vornariq CLI Agent",
        description:
          "General coding-agent role for tasks submitted through vornariq run.",
        capabilities: [],
      },
      candidates,
      requiredCapabilities: options.requiredCapabilities,
      policy: {
        schemaVersion: 1,
        rules: [],
        defaultProviderOrder: options.providers,
      },
    });
    dependencies.stdout(
      options.json ? `${JSON.stringify(result)}\n` : humanOutput(result),
    );
    return resultExitCode(result);
  } catch (error) {
    dependencies.stderr(
      error instanceof CliError
        ? `CLI_CONFIGURATION_ERROR: ${error.message}\n`
        : "CLI_INFRASTRUCTURE_ERROR: Unable to complete routed execution.\n",
    );
    return 1;
  }
}
