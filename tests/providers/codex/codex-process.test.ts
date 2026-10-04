import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildCodexExecArgs,
  MAX_STDERR_BYTES,
  NodeCodexProcessRunner,
} from "../../../src/providers/codex/codex-process.js";
import { workingDirectory } from "./test-support.js";

describe("Codex command arguments", () => {
  it("uses JSONL, stdin, and the safe read-only sandbox by default shape", () => {
    const args = buildCodexExecArgs({
      sandbox: "read-only",
      workingDirectory,
    });

    expect(args).toEqual([
      "exec",
      "--json",
      "--sandbox",
      "read-only",
      "--cd",
      workingDirectory,
      "-",
    ]);
  });

  it("does not bypass local user configuration, rules, or approvals", () => {
    const args = buildCodexExecArgs({
      sandbox: "workspace-write",
      workingDirectory,
    });

    expect(args).not.toContain("--full-auto");
    expect(args).not.toContain("--ignore-user-config");
    expect(args).not.toContain("--ignore-rules");
    expect(args).not.toContain("--approve-for-me");
    expect(args).not.toContain("--dangerously-bypass-approvals-and-sandbox");
    expect(args).not.toContain("danger-full-access");
  });

  it("does not pass credentials or Codex auth-file paths", () => {
    const args = buildCodexExecArgs({
      sandbox: "read-only",
      workingDirectory,
    }).join(" ");

    expect(args).not.toMatch(/auth\.json|api[_-]?key|access[_-]?token/i);
  });

  it("bounds stderr captured by the production process runner", async () => {
    const runner = new NodeCodexProcessRunner();
    const lines: string[] = [];
    const result = await runner.run({
      executable: process.execPath,
      args: [
        "-e",
        `process.stderr.write("x".repeat(${String(MAX_STDERR_BYTES + 1024)})); process.stdout.write('{"type":"turn.started"}\\n');`,
      ],
      cwd: resolve("."),
      stdin: "",
      onStdoutLine: (line) => {
        lines.push(line);
      },
    });

    expect(Buffer.byteLength(result.stderr, "utf8")).toBe(MAX_STDERR_BYTES);
    expect(result.stderrTruncated).toBe(true);
    expect(lines).toEqual(['{"type":"turn.started"}']);
  });

  it("surfaces a missing executable from the production process runner", async () => {
    const runner = new NodeCodexProcessRunner();
    const lines: string[] = [];

    await expect(
      runner.run({
        executable: "vornariq-definitely-missing-codex-executable",
        args: [],
        cwd: resolve("."),
        stdin: "",
        onStdoutLine: (line) => {
          lines.push(line);
        },
      }),
    ).rejects.toMatchObject({ code: "ENOENT" });
    expect(lines).toEqual([]);
  });
});
