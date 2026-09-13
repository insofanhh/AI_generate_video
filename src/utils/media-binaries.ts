import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { join } from "node:path";
const require = createRequire(import.meta.url);

export function mediaBinary(name: string): string {
  if (!["ffmpeg", "ffprobe"].includes(name)) return name;
  if (process.env.FFMPEG_DIR) return join(process.env.FFMPEG_DIR, name + (process.platform === "win32" ? ".exe" : ""));
  try {
    const binary = name === "ffmpeg" ? require("ffmpeg-static") : require("ffprobe-static").path;
    if (typeof binary === "string" && existsSync(binary)) return binary;
  } catch { /* fall back to the system PATH */ }
  return name;
}
