import axios from "axios";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { load } from "cheerio";

export class ArticleReadError extends Error {
  constructor(public code: string, message: string) { super(message); this.name = "ArticleReadError"; }
}

export function articleHttpError(status: number, hostname: string): ArticleReadError {
  const reason = status === 401 || status === 403
    ? `${hostname} từ chối đọc tự động (HTTP ${status}). Trang có thể yêu cầu đăng nhập hoặc chặn trình thu thập nội dung.`
    : status === 404 || status === 410 ? `Không tìm thấy bài viết trên ${hostname} (HTTP ${status}). Kiểm tra lại đường dẫn.`
    : status === 429 ? `${hostname} đang giới hạn lượt truy cập (HTTP 429). Hãy thử lại sau.`
    : `Không tải được bài viết từ ${hostname} (HTTP ${status}). Hãy thử lại sau.`;
  return new ArticleReadError(status === 401 || status === 403 ? "access_denied" : "http_error", reason + " Bạn có thể mở bài gốc và nhập phần nội dung bạn đọc được vào Studio.");
}

export function isPublicAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)));
  }
  // Only global IPv6 unicast; reject mapped IPv4, loopback and local ranges.
  return isIP(ip) === 6 && /^[23]/i.test(ip) && !/^2001:(db8|0:)/i.test(ip);
}

export async function fetchPublic(raw: string, kind: "html" | "image", referer?: string): Promise<{ bytes: Buffer; url: string; mime: string }> {
  let url = new URL(raw);
  for (let hop = 0; hop < 5; hop++) {
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || (url.port && !["80", "443"].includes(url.port))) throw new Error("Chỉ hỗ trợ URL HTTP/HTTPS công khai.");
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = await lookup(hostname, { all: true });
    if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) throw new Error("Không thể đọc địa chỉ mạng nội bộ.");
    const pinned = addresses[0];
    const response = await axios.get(url.href, {
      responseType: "arraybuffer", timeout: 25000, maxRedirects: 0,
      maxContentLength: kind === "html" ? 5 * 1024 * 1024 : 15 * 1024 * 1024,
      proxy: false,
      // Pin the validated address so DNS changes cannot reach a private service.
      lookup: ((_host: string, options: any, callback: any) => options.all
        ? callback(null, [pinned]) : callback(null, pinned.address, pinned.family)) as any,
      headers: { "User-Agent": "Mozilla/5.0 NewsroomLocal/1.0", ...(referer ? { Referer: referer } : {}) },
      validateStatus: status => status >= 200 && status < 600,
    }).catch(error => {
      if (kind !== "html") throw error;
      throw new ArticleReadError("network_error", "Không kết nối được với trang bài viết hoặc trang phản hồi quá lâu. Hãy thử lại hoặc mở bài gốc để nhập nội dung thủ công.");
    });
    if (response.status >= 400) {
      if (kind === "html") throw articleHttpError(response.status, url.hostname);
      throw new Error(`Không tải được ảnh (HTTP ${response.status}).`);
    }
    if (response.status >= 300) {
      if (!response.headers.location) throw new Error("Bài viết chuyển hướng không hợp lệ.");
      url = new URL(response.headers.location, url); continue;
    }
    const mime = String(response.headers["content-type"] ?? "").split(";")[0];
    if (kind === "html" && !/html|xhtml/.test(mime)) throw new Error("Link này không phải trang bài viết HTML.");
    if (kind === "image" && !/^image\/(jpeg|png|webp|gif)$/.test(mime)) throw new Error("Ảnh phải là JPG, PNG, WebP hoặc GIF.");
    return { bytes: Buffer.from(response.data), url: url.href, mime };
  }
  throw new Error("Bài viết chuyển hướng quá nhiều lần.");
}

export interface Article { url: string; title: string; domain: string; publishedAt: string; text: string; images: { url: string; alt: string }[] }
export function parseArticle(html: string, url: string): Article {
  const $ = load(html);
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  const title = clean($('meta[property="og:title"]').attr("content") || $("h1").first().text() || $("title").text());
  const publishedAt = ($('meta[property="article:published_time"]').attr("content") || $("time[datetime]").first().attr("datetime") || "").slice(0, 10);
  const structured: any[] = [];
  $("script[type='application/ld+json']").each((_, el) => {
    try { const value = JSON.parse($(el).text()); structured.push(...(Array.isArray(value) ? value : [value]), ...(value["@graph"] || [])); } catch { /* invalid publisher JSON */ }
  });
  const news = structured.find(v => /Article|NewsArticle|ReportageNewsArticle/.test(String(v["@type"])));
  $("script,style,nav,footer,header,aside,form,noscript,[aria-hidden=true],.related-news,.related-articles,.advertisement").remove();
  const candidates = $("article,[itemprop=articleBody],.fck_detail,.detail-content,.article-content,.entry-content,main").toArray();
  const content = candidates.sort((a, b) => $(b).find("p").text().length - $(a).find("p").text().length)[0];
  const body = content ? $(content) : $("body");
  const paragraphs = body.find("p").toArray().map(el => clean($(el).text())).filter(t => t.length > 35);
  const text = clean(news?.articleBody || "") || [...new Set(paragraphs)].join("\n\n");
  const images: Article["images"] = [];
  const add = (src: unknown, alt = "") => {
    if (typeof src !== "string" || !src.trim()) return;
    try { const full = new URL(src, url); if (!/^https?:$/.test(full.protocol) || images.some(i => i.url === full.href)) return;
      images.push({ url: full.href, alt: clean(alt).slice(0, 180) }); } catch { /* invalid media URL */ }
  };
  add($('meta[property="og:image"]').attr("content"), title);
  for (const value of [news?.image].flat().filter(Boolean)) add(typeof value === "string" ? value : value.url, title);
  body.find("img").each((_, el) => {
    const img = $(el);
    if ((Number(img.attr("width")) > 0 && Number(img.attr("width")) < 160) || /logo|icon|avatar|banner/i.test(img.attr("class") || "")) return;
    const set = img.attr("data-srcset") || img.attr("srcset");
    add(img.attr("data-src") || img.attr("data-original") || (set ? set.split(",").pop()?.trim().split(/\s+/)[0] : "") || img.attr("src"), img.attr("alt") || "");
  });
  if (text.length < 120) throw new ArticleReadError("insufficient_content", "Không đọc được đủ nội dung (trang có thể cần JavaScript, đăng nhập hoặc chặn truy cập). Hãy mở bài gốc và nhập nội dung bạn đọc được bên dưới.");
  return { url, title: title.slice(0, 240), domain: new URL(url).hostname, publishedAt, text: text.slice(0, 35000), images: images.slice(0, 30) };
}
