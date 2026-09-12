import { z } from "zod";
import axios from "axios";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import type { TemplateSceneType, TemplateScript } from "./template-script-schema.js";

export const NewsInputsSchema = z.object({
  theme: z.enum(["slide", "light", "dark", "modern"]).default("slide"),
  category: z.string().max(32).default("Thời sự"),
  headline: z.string().min(1).max(120),
  summary: z.string().max(240).default(""),
  channel: z.string().max(40).default("Bản tin"),
  date: z.string().max(32).default(""),
  source: z.string().max(100).default(""),
  images: z.array(z.object({
    src: z.string().min(1),
    alt: z.string().max(180).default(""),
    credit: z.string().max(100).default(""),
    fit: z.enum(["cover", "contain"]).default("cover"),
  })).max(6).default([]),
  caption: z.string().max(160).default(""),
  section: z.string().max(40).default(""),
});

export function resolveNewsInputs(script: TemplateScript, scene: TemplateSceneType, index: number) {
  return NewsInputsSchema.parse({
    headline: script.metadata.title,
    channel: script.metadata.channel,
    source: script.metadata.source.domain === "local" ? "" : script.metadata.source.domain,
    date: script.metadata.publishedAt ?? "",
    images: script.metadata.source.image ? [{ src: script.metadata.source.image }] : [],
    section: scene.type === "outro" ? "Kết thúc bản tin" : `Bản tin / ${String(index + 1).padStart(2, "0")}`,
    ...scene.inputs,
  });
}

/** Embed media before rendering: local paths resolve beside script.json, not the template. */
export async function embedNewsImages(inputs: z.infer<typeof NewsInputsSchema>, scriptDir: string) {
  const images = await Promise.all(inputs.images.map(async (image) => {
    if (/^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,/i.test(image.src)) return image;
    let bytes: Buffer;
    let mime: string;
    if (/^https?:\/\//i.test(image.src)) {
      const response = await axios.get<ArrayBuffer>(image.src, {
        responseType: "arraybuffer", timeout: 30000, maxContentLength: 20 * 1024 * 1024,
      });
      mime = String(response.headers["content-type"] ?? "").split(";")[0];
      bytes = Buffer.from(response.data);
    } else {
      const formats: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml" };
      mime = formats[extname(image.src).toLowerCase()] ?? "";
      bytes = await readFile(resolve(scriptDir, image.src));
    }
    if (!/^image\/(png|jpeg|webp|gif|svg\+xml)$/.test(mime)) {
      throw new Error(`Unsupported news image type: ${mime || "unknown"}`);
    }
    return { ...image, src: `data:${mime};base64,${bytes.toString("base64")}` };
  }));
  return { ...inputs, images };
}
