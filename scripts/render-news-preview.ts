import { readFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { TemplateScriptSchema } from "../src/render/template-script-schema.js";
import { resolveNewsInputs, embedNewsImages } from "../src/render/news-inputs.js";
import { composeTemplate } from "../src/render/template-composer.js";

const script = TemplateScriptSchema.parse(JSON.parse(await readFile("examples/news/script.json", "utf8")));
const inputs = await embedNewsImages(resolveNewsInputs(script, script.scenes[0], 0), resolve("examples/news"));
await mkdir("output", { recursive: true });
await composeTemplate({
  templateId: "frame-news", inputs, aspect: "9:16",
  outputPath: "output/news-preview.mp4", fps: 30, quality: "standard",
});
