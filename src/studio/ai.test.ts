import { afterEach, describe, expect, it } from "vitest";
import nock from "nock";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AiSettingsSchema, generateDraft } from "./ai.js";
const dirs: string[] = [];
afterEach(async () => { nock.cleanAll(); await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true }))); });
const article = { url: "https://example.org/story", domain: "example.org", title: "Tin mới", publishedAt: "", text: "Nội dung nguồn được dùng để tạo kịch bản.", images: [] };
const options = { language: "Vietnamese", duration: 30, direction: "Ngắn gọn" };
async function directory() { const dir = await mkdtemp(join(tmpdir(), "studio-ai-")); dirs.push(dir); return dir; }
describe("configurable AI API", () => {
  it("uses the selected endpoint, model and key, and validates the generated scenes", async () => {
    const draft = { title: "Bản tin", scenes: Array.from({ length: 3 }, () => ({ headline: "Tiêu đề", summary: "Tóm tắt", voiceText: "Nội dung lời đọc.", imageIndex: -1 })) };
    nock("https://ai.example.org", { reqheaders: { authorization: "Bearer test-key" } }).post("/v1/chat/completions", body => {
      expect(body.model).toBe("chosen-model"); expect(body.response_format).toEqual({ type: "json_object" });
      expect(body.messages[1].content).toContain("untrusted source material"); return true;
    }).reply(200, { choices: [{ message: { content: JSON.stringify(draft) } }] });
    const result = await generateDraft(article, options, await directory(), AiSettingsSchema.parse({ provider: "api", baseUrl: "https://ai.example.org/v1/", model: "chosen-model", apiKey: "test-key" }));
    expect(result).toEqual(draft); expect(nock.isDone()).toBe(true);
  });
  it("reports authentication failure without returning the API key", async () => {
    nock("https://ai.example.org").post("/v1/chat/completions").reply(401, { error: "test-key" });
    await expect(generateDraft(article, options, await directory(), AiSettingsSchema.parse({ provider: "api", baseUrl: "https://ai.example.org/v1", model: "model", apiKey: "test-key" }))).rejects.toThrow("API AI trả lỗi 401");
  });
});
