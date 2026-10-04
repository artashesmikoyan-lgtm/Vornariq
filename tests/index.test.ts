import { describe, expect, it } from "vitest";

import { project } from "../src/index.js";

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
});
