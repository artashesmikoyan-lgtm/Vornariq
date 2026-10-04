import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  buildGeminiExecArgs,
  GEMINI_HEADLESS_INSTRUCTION,
  GEMINI_MAX_STDERR_BYTES,
  NodeGeminiProcessRunner,
} from "../../../src/providers/gemini/gemini-process.js";
import { GeminiProtocolError } from "../../../src/providers/gemini/gemini-stream-json.js";

describe("Gemini process boundary", () => {
  it("uses headless stream-json with the default approval policy", () => {
    expect(buildGeminiExecArgs({ sandbox: false })).toEqual([
      "--approval-mode",
      "default",
      "--output-format",
      "stream-json",
      "-p",
      GEMINI_HEADLESS_INSTRUCTION,
    ]);
  });

  it("does not bypass trust, approvals, or output sanitization", () => {
    const args = buildGeminiExecArgs({ sandbox: false });
    const command = args.join(" ");

    expect(args).not.toContain("--yolo");
    expect(args).not.toContain("-y");
    expect(command).not.toContain("approval-mode yolo");
    expect(command).not.toContain("approval-mode auto_edit");
    expect(command).not.toContain("approval-mode plan");
    expect(args).not.toContain("--skip-trust");
    expect(args).not.toContain("--raw-output");
    expect(args).not.toContain("--accept-raw-output-risk");
    expect(command).not.toMatch(/api[_-]?key|credential|auth[_-]?file/i);
    expect(args).not.toContain("--model");
    expect(args).not.toContain("--resume");
  });

  it("enables sandboxing only when explicitly requested", () => {
    expect(buildGeminiExecArgs({ sandbox: true })).toContain("--sandbox");
    expect(buildGeminiExecArgs({ sandbox: false })).not.toContain("--sandbox");
  });

  it("passes stdin directly, closes it, and respects cwd", async () => {
    const runner = new NodeGeminiProcessRunner();
    const lines: string[] = [];
    const result = await runner.run({
      executable: process.execPath,
      args: [
        "-e",
        "let input = ''; process.stdin.setEncoding('utf8'); process.stdin.on('data', chunk => input += chunk); process.stdin.on('end', () => process.stdout.write(JSON.stringify({ input, cwd: process.cwd() }) + '\\n'));",
      ],
      cwd: resolve("tests/fixtures/gemini"),
      stdin: "deterministic stdin",
      onStdoutLine: (line) => {
        lines.push(line);
      },
    });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(lines[0] ?? "") as unknown).toEqual({
      input: "deterministic stdin",
      cwd: resolve("tests/fixtures/gemini"),
    });
  });

  it("bounds captured stderr", async () => {
    const runner = new NodeGeminiProcessRunner();
    const result = await runner.run({
      executable: process.execPath,
      args: [
        "-e",
        `process.stderr.write("x".repeat(${String(GEMINI_MAX_STDERR_BYTES + 1024)}));`,
      ],
      cwd: resolve("."),
      stdin: "",
      onStdoutLine: () => undefined,
    });

    expect(Buffer.byteLength(result.stderr, "utf8")).toBe(
      GEMINI_MAX_STDERR_BYTES,
    );
    expect(result.stderrTruncated).toBe(true);
  });

  it("surfaces a missing executable", async () => {
    const runner = new NodeGeminiProcessRunner();

    await expect(
      runner.run({
        executable: "vornariq-definitely-missing-gemini-executable",
        args: [],
        cwd: resolve("."),
        stdin: "",
        onStdoutLine: () => undefined,
      }),
    ).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("terminates the child when stream parsing fails", async () => {
    const runner = new NodeGeminiProcessRunner();

    await expect(
      runner.run({
        executable: process.execPath,
        args: [
          "-e",
          "process.stdout.write('invalid\\n'); setInterval(() => {}, 1000);",
        ],
        cwd: resolve("."),
        stdin: "",
        onStdoutLine: () => {
          throw new GeminiProtocolError("synthetic parser failure");
        },
      }),
    ).rejects.toThrow("synthetic parser failure");
  });
});
