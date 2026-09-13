import { afterEach, describe, expect, it, vi } from "vitest";
import nock from "nock";
import { isPublicAddress, parseArticle, fetchPublic } from "./article.js";

vi.mock("node:dns/promises", () => ({ lookup: vi.fn(async () => [{ address: "8.8.8.8", family: 4 }]) }));
afterEach(() => nock.cleanAll());

describe("article fetch failures", () => {
  it.each([401, 403, 404, 429, 503])("reports publisher HTTP %s with an actionable message", async status => {
    nock("https://publisher.example").get("/story").reply(status, "Internal publisher error details");
    await expect(fetchPublic("https://publisher.example/story", "html")).rejects.toMatchObject({
      name: "ArticleReadError", code: [401,403].includes(status) ? "access_denied" : "http_error",
      message: expect.stringMatching(new RegExp(`publisher\\.example.*HTTP ${status}`)),
    });
    expect(nock.isDone()).toBe(true);
  });
  it("handles a blocked redirect destination without returning error HTML as article text", async () => {
    nock("https://publisher.example").get("/story").reply(302, "", { location: "/blocked" }).get("/blocked").reply(403, "<p>Access denied</p>");
    await expect(fetchPublic("https://publisher.example/story", "html")).rejects.toMatchObject({ code: "access_denied" });
    expect(nock.isDone()).toBe(true);
  });
  it("reports network failures without raw transport errors", async () => {
    nock("https://publisher.example").get("/story").replyWithError("socket failure");
    await expect(fetchPublic("https://publisher.example/story", "html")).rejects.toMatchObject({ code: "network_error", message: expect.stringContaining("nhập nội dung thủ công") });
  });
  it("still fetches a readable article", async () => {
    nock("https://publisher.example").get("/story").reply(200, "<article>Public article</article>", { "Content-Type": "text/html; charset=utf-8" });
    const result = await fetchPublic("https://publisher.example/story", "html");
    expect(result.bytes.toString()).toBe("<article>Public article</article>");
  });
});

describe("article extraction", () => {
  it("extracts article text, lazy images, metadata and resolves relative URLs", () => {
    const article = parseArticle(`<html><head><meta property="og:title" content="Một bài báo &amp; hình ảnh"><meta property="article:published_time" content="2026-09-12T08:00:00Z"><meta property="og:image" content="/cover.jpg"></head><body><nav><p>Navigation repeated navigation navigation navigation</p></nav><article><h1>Tiêu đề</h1><p>Đây là đoạn đầu của bài viết, cung cấp nội dung cần thiết để tạo một bản tin có nguồn rõ ràng.</p><p>Đoạn thứ hai nói thêm về sự kiện, nêu các thông tin đã được xác nhận và tránh suy đoán.</p><img data-src="/photo.jpg" alt="Ảnh bài viết"><img src="/cover.jpg"></article></body></html>`, "https://example.org/news/item");
    expect(article.title).toBe("Một bài báo & hình ảnh");
    expect(article.publishedAt).toBe("2026-09-12");
    expect(article.text).not.toContain("Navigation");
    expect(article.images.map(i => i.url)).toEqual(["https://example.org/cover.jpg", "https://example.org/photo.jpg"]);
  });
  it("does not fabricate an article when blocked or empty", () => {
    expect(() => parseArticle("<h1>Access denied</h1>", "https://example.org")).toThrow("Không đọc được đủ nội dung");
  });
});
describe("public URL address filtering", () => {
  it.each(["127.0.0.1", "10.0.0.1", "192.168.1.1", "172.16.0.2", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "::ffff:127.0.0.1", "fc00::1", "fe80::1"])("rejects local address %s", address => expect(isPublicAddress(address)).toBe(false));
  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])("allows global address %s", address => expect(isPublicAddress(address)).toBe(true));
});
