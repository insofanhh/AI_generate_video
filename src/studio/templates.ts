import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";

type Field = { key: string; label: string; max: number; source?: string; value?: string; lines?: number; required?: boolean };
type Template = { id: string; name: string; description: string; color: string; mark: string; images: boolean; aspects: string[]; fields: Field[] };
const f = (key: string, label: string, max: number, source?: string, extra: Partial<Field> = {}): Field => ({ key, label, max, source, ...extra });
const entries: Omit<Template, "aspects" | "images">[] = [
  { id: "frame-news", name: "Bản tin thời sự", description: "Ảnh lớn, tiêu đề và nguồn tin. Có 4 tone màu.", color: "#b62d40", mark: "NEWS", fields: [] },
  { id: "frame-liquid-bg-hero", name: "Liquid Hero", description: "Nền chuyển động, tiêu đề gradient và hiệu ứng ánh sáng.", color: "#474ba5", mark: "Aurora", fields: [f("kicker", "Nhãn mở đầu", 24, "channel"), f("headline", "Tiêu đề", 60, "headline"), f("subheadline", "Mô tả", 120, "summary"), f("cta", "Nhãn cuối", 24), f("brand", "Tên kênh", 24, "channel")] },
  { id: "frame-bold-poster", name: "Bold Poster", description: "Poster chữ lớn, điểm nhấn đỏ và tiêu đề 3 dòng.", color: "#9e2437", mark: "BOLD.", fields: [f("kicker", "Nhãn đầu trang", 24, "channel"), f("date", "Ngày / số bản tin", 24, "date"), f("figure", "Số nổi bật (tùy chọn)", 4), f("headline", "Tiêu đề · mỗi dòng một ý", 14, "headline", { lines: 3 }), f("standfirst", "Mô tả", 160, "summary"), f("footer_left", "Tên kênh", 32, "channel"), f("footer_right", "Nguồn", 32, "source")] },
  { id: "frame-glitch-title", name: "Glitch Title", description: "Tiêu đề cyberpunk với hiệu ứng nhiễu cyan và magenta.", color: "#1c687d", mark: "GLITCH_", fields: [f("title", "Tiêu đề", 40, "headline"), f("subtitle", "Dòng phụ", 80, "summary")] },
  { id: "frame-creative-voltage", name: "Creative Voltage", description: "Chia mảng xanh điện, chữ xếp lớp và nét viết tay.", color: "#315bef", mark: "VOLT", fields: [f("meta", "Nhãn", 40, "channel"), f("display_lines", "Tiêu đề · mỗi dòng một ý", 18, "headline", { lines: 4 }), f("script", "Chữ viết tay", 20), f("caption", "Chú thích", 60, "summary")] },
  { id: "frame-build-minimal", name: "Build Minimal", description: "Một từ khóa nổi bật trên nền tối và ánh vàng.", color: "#886330", mark: "FOCUS", fields: [f("eyebrow", "Nhãn", 20, "channel"), f("hero", "Từ khóa chính", 10, "headline", { required: true }), f("desc", "Mô tả", 90, "summary"), f("side_left", "Nhãn trái", 20, "channel"), f("side_right", "Nhãn phải", 20, "source")] },
  { id: "frame-pentagram-stat", name: "Pentagram Stat", description: "Số liệu lớn, ánh neon vàng và cyan trên nền tối.", color: "#156b7a", mark: "82%", fields: [f("label", "Tên chỉ số", 40, "headline"), f("headline", "Số liệu đã xác nhận", 12, undefined, { required: true }), f("subtitle", "Diễn giải", 120, "summary"), f("anchor", "Số nền (tùy chọn)", 4), f("footer_left", "Tên kênh", 32, "channel"), f("footer_right", "Nguồn", 32, "source")] },
  { id: "frame-vignelli", name: "Vignelli", description: "Số liệu trắng trên nền than, một cột nhấn đỏ.", color: "#3d4148", mark: "62%", fields: [f("kicker", "Nhãn", 30, "channel"), f("number", "Số liệu đã xác nhận", 6, undefined, { required: true }), f("label", "Tên chỉ số", 40, "headline"), f("note", "Diễn giải", 120, "summary"), f("brand", "Tên kênh", 24, "channel")] },
  { id: "frame-aicoding-list", name: "Danh sách", description: "Từ 2–5 thẻ nội dung, phù hợp tổng hợp các ý chính.", color: "#985333", mark: "01—05", fields: [f("title", "Tiêu đề", 40, "headline"), f("accent", "Từ nhấn màu", 20), f("subtitle", "Mô tả", 60, "summary"), ...Array.from({ length: 5 }, (_, i) => [f(`items.${i}.title`, `Ý ${i + 1} · Tiêu đề`, 24, undefined, { required: i < 2 }), f(`items.${i}.desc`, `Ý ${i + 1} · Chi tiết`, 40)]).flat()] },
  { id: "frame-aicoding-comparison", name: "So sánh", description: "Hai cột đối chiếu. Tự nhập nội dung đã kiểm chứng.", color: "#28766c", mark: "A / B", fields: [f("badge", "Nhãn", 16, undefined, { value: "So sánh" }), f("pre", "Chữ trước tiêu đề", 16), f("vs", "Chữ giữa hai cột", 6, undefined, { value: "vs" }), f("post", "Chữ sau tiêu đề", 16), ...["left", "right"].flatMap((side, i) => [f(`${side}.label`, `Cột ${i + 1} · Tên`, 8, undefined, { required: true }), f(`${side}.bullets`, `Cột ${i + 1} · Mỗi dòng một ý`, 55, undefined, { lines: 4, required: true }), f(`${side}.stat`, `Cột ${i + 1} · Số liệu (tùy chọn)`, 12), f(`${side}.stat_label`, `Cột ${i + 1} · Nhãn số liệu`, 30)])] },
  { id: "frame-statement-outro", name: "Statement Outro", description: "Thẻ kết thúc với tên kênh lớn và đường nhấn đỏ.", color: "#ac393b", mark: "THE END", fields: [f("cta", "Thông điệp kết", 60, "headline"), f("channel", "Tên kênh", 24, "channel"), f("source", "Nguồn", 40, "source")] },
  { id: "frame-logo-outro", name: "Logo Outro", description: "Kết thúc với biểu tượng chuyển động, tên kênh và tagline.", color: "#6b4794", mark: "✦", fields: [f("brand_name", "Tên kênh", 60, "channel"), f("tagline", "Thông điệp", 120, "summary"), f("primary_url", "Nguồn / website", 40, "source")] },
];
export const templateCatalog: Template[] = entries.map(t => ({ ...t, images: t.id === "frame-news", aspects: t.id === "frame-news" ? ["9:16", "16:9", "1:1"] : ["9:16", "16:9"] }));
export function getTemplate(id: string, aspect?: string) {
  const template = templateCatalog.find(t => t.id === id);
  if (!template) throw new Error("Template không hợp lệ.");
  if (aspect && !template.aspects.includes(aspect)) throw new Error(`${template.name} chưa có bố cục ${aspect}. Chọn 9:16 hoặc 16:9.`);
  return template;
}
export const TemplateSeedSchema = z.object({ headline: z.string().max(120), summary: z.string().max(240), channel: z.string().max(40), source: z.string().max(100), date: z.string().max(32), theme: z.enum(["slide", "light", "dark", "modern"]), locale: z.enum(["vi", "en"]), section: z.string().max(40) });
export type TemplateSeed = z.infer<typeof TemplateSeedSchema>;
export function wrapLines(text: string, max: number, count: number) {
  const lines = [""];
  for (const word of text.trim().split(/\s+/)) {
    const i = lines.length - 1;
    if (!lines[i]) lines[i] = word.slice(0, max);
    else if ((lines[i] + " " + word).length <= max) lines[i] += " " + word;
    else if (lines.length < count) lines.push(word.slice(0, max));
    else break;
  }
  return lines;
}
export function buildTemplateInputs(id: string, seed: TemplateSeed, raw: unknown = {}, strict = false) {
  const template = getTemplate(id);
  const overrides = z.record(z.string(), z.string().max(2000)).parse(raw);
  if (Object.keys(overrides).some(key => !template.fields.some(field => field.key === key))) throw new Error("Có trường nội dung không thuộc template đã chọn.");
  if (id === "frame-news") return { inputs: { ...seed, category: seed.locale === "en" ? "News" : "Thời sự", images: [] }, values: {} as Record<string, string> };
  const inputs: Record<string, any> = {};
  const values: Record<string, string> = {};
  for (const field of template.fields) {
    const original = field.source ? seed[field.source as keyof TemplateSeed] : field.value || "";
    const value = overrides[field.key] ?? (field.lines ? wrapLines(original, field.max, field.lines).join("\n") : original.slice(0, field.max));
    const lines = value.split(/\r?\n/);
    if (field.lines ? lines.length > field.lines || lines.some(line => line.length > field.max) : value.length > field.max) throw new Error(`${template.name}: ${field.label} tối đa ${field.max} ký tự${field.lines ? ` mỗi dòng, ${field.lines} dòng` : ""}.`);
    if (strict && field.required && !value.trim()) throw new Error(`${template.name}: cần nhập “${field.label}” trong Nội dung riêng của template.`);
    values[field.key] = value;
    const keys = field.key.split("."); let target = inputs;
    keys.slice(0, -1).forEach((key, i) => { target[key] ??= /^\d+$/.test(keys[i + 1]) ? [] : {}; target = target[key]; });
    target[keys[keys.length - 1]] = field.lines ? lines.filter(line => line.trim()) : value;
  }
  if (id === "frame-aicoding-list") inputs.items = inputs.items.filter((item: any) => item.title.trim()).map((item: any) => ({ ...item, icon: "", tag: "", level: "info" }));
  if (id === "frame-aicoding-comparison") { inputs.left.win = false; inputs.right.win = false; }
  if (id === "frame-creative-voltage") inputs.accent_index = 1;
  return { inputs, values };
}
export async function templatePreview(root: string, id: string, aspect: string, seed: TemplateSeed, overrides: unknown, images: any[]) {
  const template = getTemplate(id, aspect);
  const entry = aspect === "9:16" ? "compositions/portrait.html" : aspect === "1:1" ? "compositions/square.html" : "index.html";
  const result = buildTemplateInputs(id, seed, overrides);
  if (template.images) result.inputs.images = images;
  const file = await readFile(join(root, "templates", id, entry), "utf8");
  const base = `/template-assets/${id}/${entry.includes("/") ? "compositions/" : ""}`;
  const injected = `<base href="${base}"><script>window.__hyperframes={getVariables:()=>(${JSON.stringify(result.inputs).replace(/</g, "\\u003c")})};</script>`;
  return { html: file.replace(/<head\b[^>]*>/i, match => match + injected), values: result.values, width: aspect === "16:9" ? 1920 : 1080, height: aspect === "9:16" ? 1920 : 1080 };
}
