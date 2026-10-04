/** A JSON number must be finite; JSON has no representation for NaN or Infinity. */
export type JsonPrimitive = string | number | boolean | null;

export type JsonArray = readonly JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

/**
 * Data that can be serialized with JSON.stringify without a custom serializer.
 * Class instances and other values with non-JSON semantics are not permitted.
 */
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

/**
 * An ISO 8601 timestamp normalized to UTC, for example
 * `2026-10-04T12:00:00.000Z`.
 */
export type Iso8601UtcTimestamp = string;
