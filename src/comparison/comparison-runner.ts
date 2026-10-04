import type {
  ExecutionResult,
  ProviderExecutionRequest,
} from "../core/contracts/index.js";
import { ComparisonError } from "./comparison-errors.js";
import type {
  ComparisonReport,
  ComparisonRequest,
} from "./comparison-types.js";

export interface ComparisonClock {
  now(): Date;
}

const systemClock: ComparisonClock = {
  now: () => new Date(),
};

function executionId(
  comparisonId: string,
  participantIndex: number,
  providerId: string,
): string {
  return `${comparisonId}:run:${String(participantIndex + 1)}:${providerId}`;
}

function unexpectedProviderFailure(
  request: ProviderExecutionRequest,
  providerId: string,
  startedAt: string,
  completedAt: string,
): ExecutionResult {
  return {
    schemaVersion: 1,
    id: request.executionId,
    taskId: request.task.id,
    agentId: request.agent.id,
    providerId,
    status: "failed",
    createdAt: startedAt,
    startedAt,
    completedAt,
    error: {
      code: "COMPARISON_PROVIDER_EXCEPTION",
      message: "Provider adapter threw unexpectedly during comparison.",
      retryable: false,
    },
    metadata: {
      source: "comparison-runner",
    },
  };
}

function validateRequest(
  request: ComparisonRequest,
  participants: ComparisonRequest["participants"],
): void {
  if (request.id.trim().length === 0) {
    throw new ComparisonError(
      "COMPARISON_INVALID_CONFIGURATION",
      "Comparison id must not be empty.",
    );
  }

  if (participants.length < 2) {
    throw new ComparisonError(
      "COMPARISON_INSUFFICIENT_PROVIDERS",
      "A comparison requires at least two provider participants.",
    );
  }

  const providerIds = new Set<string>();
  for (const participant of participants) {
    const providerId = participant.adapter.provider.id;
    if (providerId.trim().length === 0) {
      throw new ComparisonError(
        "COMPARISON_INVALID_CONFIGURATION",
        "Comparison participants must expose a non-empty provider id.",
      );
    }
    if (providerIds.has(providerId)) {
      throw new ComparisonError(
        "COMPARISON_DUPLICATE_PROVIDER",
        `Comparison provider id must be unique: ${providerId}.`,
      );
    }
    providerIds.add(providerId);
  }
}

export class ComparisonRunner {
  readonly #clock: ComparisonClock;

  constructor(clock: ComparisonClock = systemClock) {
    this.#clock = clock;
  }

  async run(request: ComparisonRequest): Promise<ComparisonReport> {
    const participants = [...request.participants];
    validateRequest(request, participants);

    const startedAt = this.#clock.now().toISOString();
    const runs: ExecutionResult[] = [];

    for (const [index, participant] of participants.entries()) {
      const providerId = participant.adapter.provider.id;
      const providerRequest: ProviderExecutionRequest = {
        schemaVersion: 1,
        executionId: executionId(request.id, index, providerId),
        task: request.task,
        agent: request.agent,
      };
      const attemptStartedAt = this.#clock.now().toISOString();

      try {
        runs.push(await participant.adapter.execute(providerRequest));
      } catch {
        runs.push(
          unexpectedProviderFailure(
            providerRequest,
            providerId,
            attemptStartedAt,
            this.#clock.now().toISOString(),
          ),
        );
      }
    }

    return {
      schemaVersion: 1,
      id: request.id,
      taskId: request.task.id,
      agentId: request.agent.id,
      startedAt,
      completedAt: this.#clock.now().toISOString(),
      runs,
    };
  }
}
