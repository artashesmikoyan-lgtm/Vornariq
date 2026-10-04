import type {
  ExecutionResult,
  ProviderExecutionRequest,
} from "../core/contracts/index.js";
import { RuleBasedRouter } from "../router/index.js";
import { OrchestrationError } from "./orchestration-errors.js";
import type {
  OrchestrationClock,
  RouteAndExecuteRequest,
  RouteAndExecuteResult,
} from "./orchestration-types.js";

const systemClock: OrchestrationClock = { now: () => new Date() };

/** Routes once, then attempts only the selected, already configured adapter. */
export class RouteAndExecuteOrchestrator {
  readonly #router = new RuleBasedRouter();
  readonly #clock: OrchestrationClock;

  constructor(clock: OrchestrationClock = systemClock) {
    this.#clock = clock;
  }

  #timestamp(notBefore?: string): string {
    const time = this.#clock.now().getTime();
    if (!Number.isFinite(time)) {
      throw new OrchestrationError(
        "ORCHESTRATION_INVALID_CLOCK",
        "Orchestration clock must return a valid Date.",
      );
    }
    // Wall-clock adjustments cannot make the operation end before it started.
    return new Date(
      Math.max(time, notBefore === undefined ? time : Date.parse(notBefore)),
    ).toISOString();
  }

  async run(request: RouteAndExecuteRequest): Promise<RouteAndExecuteResult> {
    const startedAt = this.#timestamp();
    const routingDecision = this.#router.route(request, request.policy);
    const base = {
      schemaVersion: 1 as const,
      id: request.id,
      taskId: request.task.id,
      agentId: request.agent.id,
      startedAt,
    };
    if (routingDecision.status === "unroutable") {
      return {
        ...base,
        status: "unroutable",
        routingDecision,
        completedAt: this.#timestamp(startedAt),
      };
    }

    const selected = request.candidates.find(
      (candidate) =>
        candidate.providerId === routingDecision.selectedProviderId,
    );
    if (selected === undefined) {
      throw new OrchestrationError(
        "ORCHESTRATION_SELECTED_PROVIDER_MISSING",
        "Selected provider is missing from routing candidates.",
      );
    }
    const executionRequest: ProviderExecutionRequest = {
      schemaVersion: 1,
      executionId: `${request.id}:execution`,
      task: request.task,
      agent: request.agent,
    };
    let executionResult: ExecutionResult;
    try {
      executionResult = await selected.adapter.execute(executionRequest);
    } catch {
      const completedAt = this.#timestamp(startedAt);
      // Match ComparisonRunner's safe failure pattern; never inspect the exception.
      return {
        ...base,
        status: "executed",
        routingDecision,
        completedAt,
        executionResult: {
          schemaVersion: 1,
          id: executionRequest.executionId,
          taskId: base.taskId,
          agentId: base.agentId,
          providerId: routingDecision.selectedProviderId,
          status: "failed",
          createdAt: startedAt,
          startedAt,
          completedAt,
          error: {
            code: "ORCHESTRATION_PROVIDER_EXCEPTION",
            message:
              "Provider adapter threw unexpectedly during routed execution.",
            retryable: false,
          },
          metadata: { source: "route-and-execute-orchestrator" },
        },
      };
    }
    return {
      ...base,
      status: "executed",
      routingDecision,
      executionResult,
      completedAt: this.#timestamp(startedAt),
    };
  }
}
