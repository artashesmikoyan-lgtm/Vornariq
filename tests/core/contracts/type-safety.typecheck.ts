import type { ExecutionResult, JsonValue } from "../../../src/index.js";

export const nestedJson: JsonValue = {
  nested: ["value", 1, true, null, { portable: true }],
};

// @ts-expect-error Date requires explicit conversion to an ISO 8601 string.
export const dateValue: JsonValue = new Date();

// @ts-expect-error Functions cannot appear in durable JSON-safe values.
export const functionValue: JsonValue = () => "not serializable";

class FakeSdkResponse {
  readonly createdAt = new Date();
  readonly read = (): string => "provider-specific";
}

const sdkResponse = new FakeSdkResponse();

// @ts-expect-error Provider SDK responses must be translated explicitly.
export const jsonOutput: JsonValue = sdkResponse;

// @ts-expect-error An SDK response is not a Vornariq execution result.
export const executionResult: ExecutionResult = sdkResponse;
