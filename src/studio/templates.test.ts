import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { templateCatalog, getTemplate, buildTemplateInputs, templatePreview, type TemplateSeed } from "./templates.js";

const seed: TemplateSeed = { headline: "Thông tin hôm nay", summary: "Những nội dung đã được xác nhận từ bài viết.", channel: "BẢN TIN", source: "example.org", date: "", locale: "vi", section: "Cảnh 1", theme: "slide" };
describe("Studio template selection", () => {
  it.each(templateCatalog)("maps and previews $id in every supported aspect", async template => {
    const values = Object.fromEntries(template.fields.filter(f => f.required).map(f => [f.key, "Ý chính".slice(0, f.max)]));
    const built = buildTemplateInputs(template.id, seed, values, true);
    for (const aspect of template.aspects) {
      const preview = await templatePreview(resolve("."), template.id, aspect, seed, values, []);
      expect(preview.html).toContain(`base href="/template-assets/${template.id}/`);
      expect(preview.html).toContain(JSON.stringify(built.inputs).replace(/</g, "\\u003c"));
      expect(preview.width / preview.height).toBeCloseTo(aspect === "9:16" ? 9/16 : aspect === "16:9" ? 16/9 : 1);
    }
  });
  it("blocks unlisted templates, unsupported aspects, oversized fields and unknown keys", () => {
    expect(() => getTemplate("../frame-news")).toThrow();
    expect(() => getTemplate("frame-glitch-title", "1:1")).toThrow("chưa có bố cục");
    expect(() => buildTemplateInputs("frame-glitch-title", seed, { title: "x".repeat(41) })).toThrow("40 ký tự");
    expect(() => buildTemplateInputs("frame-glitch-title", seed, { images: "file:///secret" })).toThrow("không thuộc");
  });
  it("does not invent statistics or reuse template demo comparisons", () => {
    expect(buildTemplateInputs("frame-vignelli", seed).inputs.number).toBe("");
    expect(() => buildTemplateInputs("frame-vignelli", seed, {}, true)).toThrow("Số liệu đã xác nhận");
    const comparison = buildTemplateInputs("frame-aicoding-comparison", seed).inputs;
    expect(comparison.left.stat).toBe(""); expect(comparison.right.win).toBe(false);
  });
  it("escapes closing script tags in preview and preserves mapped input for rendering", async () => {
    const unsafe = { ...seed, headline: "</script><script>alert(1)</script>" };
    const preview = await templatePreview(resolve("."), "frame-glitch-title", "9:16", unsafe, {}, []);
    expect(preview.html).not.toContain("</script><script>alert(1)</script>");
    expect(preview.values.title).toBe(unsafe.headline);
  });
});
