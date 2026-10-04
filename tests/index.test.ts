import { describe, expect, it } from "vitest";

import { project } from "../src/index.js";
import type {
  Agent,
  EvaluationResult,
  ExecutionResult,
  JsonValue,
  Provider,
  ProviderAdapter,
  ProviderExecutionRequest,
  Task,
} from "../src/index.js";

type PublicCoreContracts =
  | Agent
  | EvaluationResult
  | ExecutionResult
  | JsonValue
  | Provider
  | ProviderAdapter
  | ProviderExecutionRequest
  | Task;

describe("project metadata", () => {
  it("exposes the package identity without claiming implemented orchestration", () => {
    expect(project).toEqual({
      name: "Vornariq",
      packageName: "vornariq",
      version: "0.0.1",
      tagline: "Intelligent orchestration for coding agents.",
      status: "pre-alpha",
    });
  });

  it("exports the core contract surface from the package entry point", () => {
    const task: Task = {
      schemaVersion: 1,
      id: "task-public-api-001",
      objective: "Verify the package entry point.",
      createdAt: "2026-10-04T12:00:00.000Z",
    };

    const publicContract: PublicCoreContracts = task;

    expect(publicContract).toBe(task);
    expect(task.schemaVersion).toBe(1);
  });
});
