import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { spawn } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_PROBE_BYTES,
  PROBE_TIMEOUT_MS,
  probeProcess,
} from "../../src/doctor/doctor-process.js";

vi.mock("node:child_process", () => ({ spawn: vi.fn() }));
vi.mock("node:fs", () => ({ readFileSync: vi.fn(), statSync: vi.fn() }));
function child() {
  const value = Object.assign(new EventEmitter(), {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    kill: vi.fn(() => true),
  });
  vi.mocked(spawn).mockReturnValue(
    value as unknown as ReturnType<typeof spawn>,
  );
  return value;
}
beforeEach(() => {
  vi.mocked(statSync).mockImplementation(() => {
    throw new Error("missing");
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.useRealTimers();
});
describe("safe diagnostic process boundary", () => {
  it("uses shell false, closed stdin, hidden windows, and discards stderr", async () => {
    const process = child();
    const pending = probeProcess("codex", ["exec", "--help"], ".");
    process.stdout.write("exec --json");
    process.stderr.write("SECRET");
    process.emit("close", 0);
    expect(await pending).toEqual({ status: "ok", stdout: "exec --json" });
    expect(spawn).toHaveBeenCalledWith("codex", ["exec", "--help"], {
      cwd: ".",
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
  });
  it.each(["stdout", "stderr"] as const)(
    "bounds %s and kills excessive output",
    async (stream) => {
      const process = child();
      const pending = probeProcess("codex", ["--version"], ".");
      process[stream].write(Buffer.alloc(MAX_PROBE_BYTES + 1));
      expect(await pending).toEqual({ status: "output-limit", stdout: "" });
      expect(process.kill).toHaveBeenCalledTimes(1);
    },
  );
  it("times out a stalled help probe", async () => {
    vi.useFakeTimers();
    const process = child();
    const pending = probeProcess("codex", ["--help"], ".");
    await vi.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS);
    expect(await pending).toEqual({ status: "timeout", stdout: "" });
    expect(process.kill).toHaveBeenCalledTimes(1);
  });
  it.each(["ENOENT", "EACCES"])("sanitizes spawn errors %s", async (code) => {
    const process = child();
    const pending = probeProcess("gemini", ["--version"], ".");
    process.emit("error", Object.assign(new Error("SECRET PATH"), { code }));
    expect(await pending).toEqual({
      status: code === "ENOENT" ? "unavailable" : "failed",
      stdout: "",
    });
  });
  it("discards diagnostic output after nonzero exit", async () => {
    const process = child();
    const pending = probeProcess("codex", ["--version"], ".");
    process.stdout.write("SECRET");
    process.emit("close", 1);
    expect(await pending).toEqual({ status: "failed", stdout: "" });
  });
  it.skipIf(process.platform !== "win32")(
    "resolves npm-style cmd launchers to Node without a shell",
    async () => {
      const processChild = child();
      vi.mocked(statSync).mockImplementation((path) => {
        if (String(path).endsWith(".exe")) throw new Error("missing");
        return { isFile: () => true, size: 100 } as ReturnType<typeof statSync>;
      });
      vi.mocked(readFileSync).mockReturnValue(
        '"%dp0%\\node_modules\\pnpm\\bin\\pnpm.cjs" %*',
      );
      const pending = probeProcess("pnpm", ["--version"], ".");
      processChild.emit("close", 0);
      await pending;
      expect(vi.mocked(spawn).mock.calls[0]?.[0]).toBe(process.execPath);
      expect(vi.mocked(spawn).mock.calls[0]?.[1]).toEqual([
        expect.stringContaining("pnpm.cjs"),
        "--version",
      ]);
    },
  );
});
