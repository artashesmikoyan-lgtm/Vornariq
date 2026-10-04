import { describe, expect, it } from "vitest";

import type { EvaluationResult } from "../../../src/core/contracts/index.js";

describe("evaluation contracts", () => {
  it("keeps assessment separate and supports qualitative findings", () => {
    const evaluation: EvaluationResult = {
      schemaVersion: 1,
      id: "evaluation-001",
      executionId: "execution-success-001",
      evaluator: {
        id: "quality-gates",
        type: "deterministic",
        name: "Repository quality gates",
      },
      outcome: "passed",
      findings: [
        {
          code: "CHECKS_PASSED",
          severity: "info",
          message: "All deterministic checks passed.",
          details: { checks: ["lint", "typecheck", "test", "build"] },
        },
      ],
      createdAt: "2026-10-04T12:05:00.000Z",
      metadata: { environment: { os: "test", network: false } },
    };

    expect(evaluation.executionId).toBe("execution-success-001");
    expect(evaluation.findings[0]).toMatchObject({
      code: "CHECKS_PASSED",
      severity: "info",
    });
    expect(evaluation.score).toBeUndefined();
    expect(JSON.parse(JSON.stringify(evaluation))).toEqual(evaluation);
  });
});
