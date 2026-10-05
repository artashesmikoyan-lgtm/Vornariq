import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import { resolveLocalCommand } from "../resolve-local-command.js";

import { GeminiProtocolError } from "./gemini-stream-json.js";

export const GEMINI_MAX_STDOUT_LINE_BYTES = 1024 * 1024;
export const GEMINI_MAX_STDERR_BYTES = 64 * 1024;
export const GEMINI_HEADLESS_INSTRUCTION =
  "Execute the read-only Vornariq task provided on stdin and return only the final result.";

export interface GeminiProcessRequest {
  readonly executable: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly stdin: string;
  readonly onStdoutLine: (line: string) => void;
}

export interface GeminiProcessResult {
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly stderr: string;
  readonly stderrTruncated: boolean;
}

export interface GeminiProcessRunner {
  run(request: GeminiProcessRequest): Promise<GeminiProcessResult>;
}

export interface GeminiExecArguments {
  readonly sandbox: boolean;
}

export function buildGeminiExecArgs({
  sandbox,
}: GeminiExecArguments): readonly string[] {
  return [
    "--approval-mode",
    "default",
    "--output-format",
    "stream-json",
    ...(sandbox ? ["--sandbox"] : []),
    "-p",
    GEMINI_HEADLESS_INSTRUCTION,
  ];
}

export class NodeGeminiProcessRunner implements GeminiProcessRunner {
  run(request: GeminiProcessRequest): Promise<GeminiProcessResult> {
    return new Promise((resolve, reject) => {
      const resolved = resolveLocalCommand(request.executable);
      if (resolved === undefined) {
        reject(new Error("Unsupported Gemini CLI launcher."));
        return;
      }
      const child = spawn(
        resolved.executable,
        [...resolved.prefix, ...request.args],
        {
          cwd: request.cwd,
          shell: false,
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        },
      );
      const stdoutDecoder = new StringDecoder("utf8");
      const stderrChunks: Buffer[] = [];
      let pendingStdout = "";
      let stderrBytes = 0;
      let stderrTruncated = false;
      let callbackError: unknown;
      let stdoutFinished = false;
      let settled = false;

      const rejectOnce = (error: unknown): void => {
        if (!settled) {
          settled = true;
          reject(
            error instanceof Error
              ? error
              : new Error("Gemini process failed with a non-Error value.", {
                  cause: error,
                }),
          );
        }
      };

      const stopForCallbackError = (error: unknown): void => {
        callbackError = error;
        if (!child.killed) {
          child.kill();
        }
      };

      const emitCompleteLines = (): unknown => {
        let newlineIndex = pendingStdout.indexOf("\n");
        while (newlineIndex >= 0 && callbackError === undefined) {
          const line = pendingStdout.slice(0, newlineIndex).replace(/\r$/, "");
          pendingStdout = pendingStdout.slice(newlineIndex + 1);
          try {
            request.onStdoutLine(line);
          } catch (error) {
            stopForCallbackError(error);
          }
          newlineIndex = pendingStdout.indexOf("\n");
        }

        if (
          callbackError === undefined &&
          Buffer.byteLength(pendingStdout, "utf8") >
            GEMINI_MAX_STDOUT_LINE_BYTES
        ) {
          stopForCallbackError(
            new GeminiProtocolError(
              "Gemini CLI emitted an oversized incomplete JSONL line.",
            ),
          );
        }

        return callbackError;
      };

      const finishStdout = (): void => {
        if (stdoutFinished || callbackError !== undefined) {
          return;
        }
        stdoutFinished = true;
        pendingStdout += stdoutDecoder.end();
        if (emitCompleteLines() !== undefined) {
          return;
        }
        if (pendingStdout.length > 0) {
          try {
            request.onStdoutLine(pendingStdout.replace(/\r$/, ""));
          } catch (error) {
            stopForCallbackError(error);
          }
        }
      };

      child.stdout.on("data", (chunk: Buffer) => {
        if (callbackError !== undefined) {
          return;
        }
        pendingStdout += stdoutDecoder.write(chunk);
        emitCompleteLines();
      });

      child.stdout.on("end", finishStdout);

      child.stderr.on("data", (chunk: Buffer) => {
        const remaining = GEMINI_MAX_STDERR_BYTES - stderrBytes;
        if (remaining <= 0) {
          stderrTruncated = true;
          return;
        }

        const captured = chunk.subarray(0, remaining);
        stderrChunks.push(captured);
        stderrBytes += captured.byteLength;
        if (captured.byteLength < chunk.byteLength) {
          stderrTruncated = true;
        }
      });

      child.stdin.on("error", (error) => {
        if (!settled && callbackError === undefined) {
          stopForCallbackError(error);
        }
      });

      child.on("error", rejectOnce);
      child.on("close", (exitCode, signal) => {
        finishStdout();
        if (settled) {
          return;
        }
        if (callbackError !== undefined) {
          rejectOnce(callbackError);
          return;
        }

        settled = true;
        resolve({
          exitCode,
          signal,
          stderr: Buffer.concat(stderrChunks, stderrBytes).toString("utf8"),
          stderrTruncated,
        });
      });

      child.stdin.end(request.stdin, "utf8");
    });
  }
}
