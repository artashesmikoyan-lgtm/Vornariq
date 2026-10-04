import { spawn } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";

export interface ProbeResult {
  readonly status:
    | "ok"
    | "unavailable"
    | "failed"
    | "timeout"
    | "output-limit"
    | "unsupported-shim";
  readonly stdout: string;
}
export type Probe = (
  executable: string,
  args: readonly string[],
  cwd: string,
) => Promise<ProbeResult>;
export const MAX_PROBE_BYTES = 128 * 1024;
export const PROBE_TIMEOUT_MS = 15000;

/** Resolve only installed Windows launchers; never evaluate shell text. */
function command(
  executable: string,
): { executable: string; prefix: string[] } | undefined {
  if (process.platform !== "win32") return { executable, prefix: [] };
  for (const directory of (process.env.PATH ?? "").split(delimiter)) {
    for (const extension of [".exe", ".cmd"]) {
      const path = join(
        directory.replace(/^"|"$/g, ""),
        executable + extension,
      );
      try {
        const info = statSync(path);
        if (!info.isFile()) continue;
        if (extension === ".exe") return { executable: path, prefix: [] };
        if (info.size > 65536) return undefined;
        const shim = readFileSync(path, "utf8");
        const script = /"%(?:~dp0|dp0%)([^"\r\n]+\.[cm]?js)"/i.exec(shim)?.[1];
        if (script === undefined) return undefined;
        const target = resolve(dirname(path), script.replace(/^[\\/]/, ""));
        if (!statSync(target).isFile()) return undefined;
        return { executable: process.execPath, prefix: [target] };
      } catch {
        // Missing PATH entry: continue to the next installed executable.
        continue;
      }
    }
  }
  return { executable, prefix: [] };
}

/** Bounded local command capture. No stderr, raw errors, or paths leave this seam. */
export const probeProcess: Probe = (executable, args, cwd) =>
  new Promise((resolveResult) => {
    const resolved = command(executable);
    if (resolved === undefined) {
      resolveResult({ status: "unsupported-shim", stdout: "" });
      return;
    }
    const child = spawn(resolved.executable, [...resolved.prefix, ...args], {
      cwd,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let bytes = 0;
    const chunks: Buffer[] = [];
    let settled = false;
    const finish = (status: ProbeResult["status"]): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolveResult({
        status,
        stdout: status === "ok" ? Buffer.concat(chunks).toString("utf8") : "",
      });
    };
    const stop = (status: ProbeResult["status"]): void => {
      child.kill();
      finish(status);
    };
    const timer = setTimeout(() => {
      stop("timeout");
    }, PROBE_TIMEOUT_MS);
    const capture = (chunk: Buffer, stdout: boolean): void => {
      if (settled) return;
      bytes += chunk.length;
      if (bytes > MAX_PROBE_BYTES) {
        stop("output-limit");
        return;
      }
      if (stdout) chunks.push(chunk);
    };
    child.stdout.on("data", (chunk: Buffer) => {
      capture(chunk, true);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      capture(chunk, false);
    });
    child.on("error", (error: NodeJS.ErrnoException) => {
      finish(error.code === "ENOENT" ? "unavailable" : "failed");
    });
    child.on("close", (code) => {
      finish(code === 0 ? "ok" : "failed");
    });
  });
