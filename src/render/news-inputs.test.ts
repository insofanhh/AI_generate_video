import { describe, it, expect, afterEach } from "vitest";
import nock from "nock";
import { TemplateScriptSchema } from "./template-script-schema.js";
import { embedNewsImages, NewsInputsSchema, resolveNewsInputs } from "./news-inputs.js";
import { readFile } from "node:fs/promises";

afterEach(() => nock.cleanAll());

describe("news inputs", () => {
  it("validates the shipped example and resolves local images beside the script", async () => {
    const script = TemplateScriptSchema.parse(JSON.parse(await readFile("examples/news/script.json", "utf8")));
    const inputs = resolveNewsInputs(script, script.scenes[0], 0);
    const embedded = await embedNewsImages(inputs, "examples/news");
    expect(embedded.images[0].src).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(inputs.date).toBe("");
    expect(inputs.source).toBe("");
  });

  it("inherits article metadata, with explicit per-scene fields taking precedence", async () => {
    const script = TemplateScriptSchema.parse(JSON.parse(await readFile("examples/news/script.json", "utf8")));
    script.metadata.publishedAt = "11.09.2026";
    script.metadata.source = { url: "https://example.com/news", domain: "example.com", image: "https://example.com/photo.jpg" };
    const scene = { ...script.scenes[0], inputs: {} };
    expect(resolveNewsInputs(script, scene, 0)).toMatchObject({ date: "11.09.2026", source: "example.com", images: [{ src: "https://example.com/photo.jpg" }] });
    expect(resolveNewsInputs(script, { ...scene, inputs: { date: "", images: [], channel: "Kênh riêng" } }, 0)).toMatchObject({ date: "", images: [], channel: "Kênh riêng" });
  });

  it("embeds downloaded images and preserves credit", async () => {
    nock("https://example.com").get("/image").reply(200, Buffer.from([1, 2, 3]), { "Content-Type": "image/png; charset=binary" });
    const inputs = NewsInputsSchema.parse({ headline: "Tin mới", images: [{ src: "https://example.com/image", credit: "Tác giả ảnh" }] });
    const result = await embedNewsImages(inputs, ".");
    expect(result.images[0]).toMatchObject({ src: "data:image/png;base64,AQID", credit: "Tác giả ảnh" });
  });

  it("fails clearly on unavailable or non-image media", async () => {
    nock("https://example.com").get("/page").reply(200, "<html>", { "Content-Type": "text/html" });
    const inputs = NewsInputsSchema.parse({ headline: "Tin mới", images: [{ src: "https://example.com/page" }] });
    await expect(embedNewsImages(inputs, ".")).rejects.toThrow("Unsupported news image type");
    await expect(embedNewsImages({ ...inputs, images: [{ src: "missing.jpg", alt: "", credit: "", fit: "cover" }] }, "examples/news")).rejects.toThrow();
  });

  it("rejects unsupported themes and copy that exceeds layout limits", () => {
    expect(NewsInputsSchema.safeParse({ headline: "Tin", theme: "neon" }).success).toBe(false);
    expect(NewsInputsSchema.safeParse({ headline: "x".repeat(121) }).success).toBe(false);
  });
});
