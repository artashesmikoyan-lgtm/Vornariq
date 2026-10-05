import { readFileSync, statSync } from "node:fs";
import { delimiter, dirname, join, resolve, isAbsolute } from "node:path";

/** Resolve only installed Windows launchers; never evaluate shell text. */
export function resolveLocalCommand(
  executable: string,
): { executable: string; prefix: string[] } | undefined {
  if (process.platform !== "win32" || isAbsolute(executable))
    return { executable, prefix: [] };
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
