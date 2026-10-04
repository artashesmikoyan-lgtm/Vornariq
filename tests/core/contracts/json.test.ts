import { describe, expect, it } from "vitest";

import type { JsonObject } from "../../../src/core/contracts/index.js";

describe("JSON-safe values", () => {
  it("round-trips nested contract data without a custom serializer", () => {
    const value: JsonObject = {
      repository: {
        name: "vornariq",
        labels: ["core", "contracts"],
        settings: {
          retries: 0,
          enabled: true,
          note: null,
        },
      },
    };

    const roundTripped = JSON.parse(JSON.stringify(value)) as unknown;

    expect(roundTripped).toEqual(value);
  });
});
