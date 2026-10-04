import type { ExecutionResult } from "../core/contracts/index.js";
import type {
  RoutingDecision,
  RoutingPolicy,
  RoutingRequest,
} from "../router/index.js";

/** The routing id also identifies this orchestration; candidates have one source. */
export interface RouteAndExecuteRequest extends RoutingRequest {
  readonly policy: RoutingPolicy;
}

export interface OrchestrationClock {
  now(): Date;
}

interface OrchestrationResultBase {
  readonly schemaVersion: 1;
  readonly id: string;
  readonly taskId: string;
  readonly agentId: string;
  readonly startedAt: string;
  readonly completedAt: string;
}

/** Durable evidence of selection and at most one execution attempt. */
export type RouteAndExecuteResult = OrchestrationResultBase &
  (
    | {
        readonly status: "executed";
        readonly routingDecision: Extract<
          RoutingDecision,
          { status: "selected" }
        >;
        readonly executionResult: ExecutionResult;
      }
    | {
        readonly status: "unroutable";
        readonly routingDecision: Extract<
          RoutingDecision,
          { status: "unroutable" }
        >;
      }
  );
