/** Public identity metadata for the pre-alpha Vornariq package. */
export const project = {
  name: "Vornariq",
  packageName: "vornariq",
  version: "0.0.1",
  tagline: "Intelligent orchestration for coding agents.",
  status: "pre-alpha",
} as const;

export type ProjectMetadata = typeof project;
