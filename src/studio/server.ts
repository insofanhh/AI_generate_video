import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, writeFile, readdir, copyFile, stat } from "node:fs/promises";
import { dirname, extname, join, resolve, delimiter } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import axios from "axios";
import { z } from "zod";
import { fetchPublic, parseArticle, ArticleReadError, type Article } from "./article.js";
import { AiSettingsSchema, generateDraft } from "./ai.js";
import { TemplateScriptSchema } from "../render/template-script-schema.js";
import { resolveNewsInputs } from "../render/news-inputs.js";
import { OmniVoiceClient } from "../tts/omnivoice-client.js";
import { VoiceSettingsSchema } from "../tts/voice-settings.js";
import { mediaBinary } from "../utils/media-binaries.js";
import { templateCatalog, getTemplate, TemplateSeedSchema, buildTemplateInputs, templatePreview } from "./templates.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const output = join(root, "output");
const storage = join(output, "studio-data");
const port = Number(process.env.STUDIO_PORT || 4173);
const endpoint = (process.env.OMNIVOICE_ENDPOINT || "http://127.0.0.1:8001").replace(/\/$/, "");
if (process.env.FFMPEG_DIR) process.env.PATH = process.env.FFMPEG_DIR + delimiter + process.env.PATH;
await mkdir(join(storage, "media"), { recursive: true });
const settingsFile = join(storage, "ai-settings.json");
let aiSettings = AiSettingsSchema.parse(existsSync(settingsFile) ? JSON.parse(await readFile(settingsFile, "utf8")) : {});
type Job = { id: string; kind: "article" | "script" | "voice" | "render"; status: "running" | "done" | "error"; progress: number; message: string; createdAt: string; result?: any; error?: string; errorCode?: string; sourceUrl?: string; logs: string[] };
const jobs = new Map<string, Job>();
for (const file of await readdir(storage)) {
  if (!/^job-[\w-]+\.json$/.test(file)) continue;
  try { const job: Job = JSON.parse(await readFile(join(storage, file), "utf8"));
    if (job.status === "running") { job.status = "error"; job.error = "Máy chủ đã khởi động lại. Bấm chạy lại để tiếp tục từ bản nháp."; }
    jobs.set(job.id, job);
  } catch { /* damaged old job */ }
}
const saveJob = (job: Job) => writeFile(join(storage, `job-${job.id}.json`), JSON.stringify(job, null, 2));
function startJob(kind: Job["kind"], task: (job: Job) => Promise<any>) {
  if ([...jobs.values()].some(j => j.status === "running" && j.kind === kind)) throw new Error("Bước này đang chạy. Hãy chờ tác vụ hiện tại hoàn tất.");
  if (["voice", "render"].includes(kind) && [...jobs.values()].some(j => j.status === "running" && ["voice", "render"].includes(j.kind))) throw new Error("OmniVoice đang bận nghe thử hoặc render. Hãy chờ tác vụ hiện tại.");
  const job: Job = { id: randomUUID(), kind, status: "running", progress: 2, message: "Đang chuẩn bị…", createdAt: new Date().toISOString(), logs: [] };
  jobs.set(job.id, job);
  void (async () => {
    await saveJob(job);
    try { job.result = await task(job); job.status = "done"; job.progress = 100; job.message = "Hoàn tất"; }
    catch (error) { job.status = "error"; job.error = error instanceof Error ? error.message : "Tác vụ thất bại."; if (error instanceof ArticleReadError) job.errorCode = error.code; }
    await saveJob(job);
  })().catch(console.error);
  return job;
}
const idSchema = z.string().uuid();
const imageRef = z.object({ id: z.string().regex(/^[a-f0-9-]+\.(jpg|png|webp|gif)$/), alt: z.string().max(180).default(""), credit: z.string().max(100).default("") });
const voiceSchema = z.object({ mode: z.enum(["design", "clone"]).default("design"), language: z.enum(["Vietnamese", "English"]).default("Vietnamese"), speed: z.number().min(0.5).max(1.5).default(1), referenceId: z.string().regex(/^[a-f0-9-]+\.(wav|mp3|m4a|ogg)$/).optional(), referenceText: z.string().max(6000).default(""), settings: VoiceSettingsSchema.default(() => VoiceSettingsSchema.parse({})) });
const fingerprint = (voice: unknown) => createHash("sha256").update(JSON.stringify(voice)).digest("hex");
const mediaPath = (id: string) => join(storage, "media", id);
const mediaUrl = (id: string) => `/media/${id}`;
const mimeExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "audio/wav": "wav", "audio/x-wav": "wav", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/ogg": "ogg" };
async function storeMedia(bytes: Buffer, mime: string) {
  const extension = mimeExtensions[mime]; if (!extension) throw new Error("Định dạng tệp không hỗ trợ.");
  const id = `${randomUUID()}.${extension}`; await writeFile(mediaPath(id), bytes); return { id, src: mediaUrl(id) };
}
async function jsonBody(req: IncomingMessage) {
  if (!req.headers["content-type"]?.startsWith("application/json")) throw new Error("Yêu cầu phải là JSON.");
  let length = 0; const chunks: Buffer[] = [];
  for await (const chunk of req) { length += chunk.length; if (length > 28 * 1024 * 1024) throw new Error("Tệp quá lớn (tối đa 20 MB)."); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
const sendJson = (res: ServerResponse, value: unknown, status = 200) => { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(value)); };
async function serveFile(req: IncomingMessage, res: ServerResponse, path: string) {
  const info = await stat(path); if (!info.isFile()) throw new Error("Không tìm thấy tệp.");
  const types: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp", ".mp4": "video/mp4", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".ogg": "audio/ogg", ".txt": "text/plain; charset=utf-8", ".json": "application/json" };
  let start = 0, end = info.size - 1;
  const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if (range) { start = Number(range[1]); end = range[2] ? Math.min(Number(range[2]), end) : end; }
  if (start > end || start >= info.size) { res.writeHead(416, { "Content-Range": `bytes */${info.size}` }).end(); return; }
  res.writeHead(range ? 206 : 200, { "Content-Type": types[extname(path)] || "application/octet-stream", "Accept-Ranges": "bytes", "Content-Length": end - start + 1, "Cache-Control": "no-cache", ...(range ? { "Content-Range": `bytes ${start}-${end}/${info.size}` } : {}) });
  createReadStream(path, { start, end }).on("error", () => res.destroy()).pipe(res);
}
function binaryAvailable(name: string) { return spawnSync(mediaBinary(name), ["-version"], { windowsHide: true, timeout: 5000, stdio: "ignore" }).status === 0; }
let omniParams: any = null;
async function getOmni() {
  const info = (await axios.get(`${endpoint}/gradio_api/info`, { timeout: 8000 })).data;
  const simplify = (key: string) => (info.named_endpoints?.[key]?.parameters || []).filter((p: any) => p.parameter_name !== "lang").map((p: any) => ({ name: p.parameter_name, label: p.label, default: p.parameter_default, choices: p.type?.enum, description: p.type?.description }));
  omniParams = { design: simplify("/_design_fn"), clone: simplify("/_clone_fn") };
  return omniParams;
}
async function validateVoice(voice: z.infer<typeof voiceSchema>) {
  const params = await getOmni();
  if (!params.clone.length || !params.design.length) throw new Error("OmniVoice thiếu API Voice Clone/Design.");
  const keys = ["gender", "age", "pitch", "style", "accent", "dialect"] as const;
  keys.forEach((key, i) => { const choices = params.design.find((p: any) => p.name === `param_${i + 9}`)?.choices;
    if (choices && !choices.includes(voice.settings[key])) throw new Error(`OmniVoice không hỗ trợ lựa chọn ${key} này.`); });
  if (voice.mode === "clone" && !voice.referenceId) throw new Error("Hãy tải lên audio mẫu trước khi dùng Voice Clone.");
}

const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    const host = req.headers.host || "";
    if (![ `127.0.0.1:${port}`, `localhost:${port}` ].includes(host)) return sendJson(res, { error: "Host không hợp lệ." }, 403);
    if (req.headers.origin && ![`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(req.headers.origin)) return sendJson(res, { error: "Origin không hợp lệ." }, 403);
    const url = new URL(req.url || "/", `http://${host}`); const path = decodeURIComponent(url.pathname);
    if (req.method === "GET" && path === "/api/templates") return sendJson(res, templateCatalog);
    if (req.method === "POST" && path === "/api/template-preview") {
      const body = z.object({ templateId: z.string(), aspect: z.enum(["9:16", "16:9", "1:1"]), seed: TemplateSeedSchema, values: z.record(z.string(), z.string()).default({}), images: z.array(imageRef).max(6).default([]) }).parse(await jsonBody(req));
      return sendJson(res, await templatePreview(root, body.templateId, body.aspect, body.seed, body.values, body.images.map(img => ({ src: mediaUrl(img.id), alt: img.alt, credit: img.credit }))));
    }
    if (req.method === "GET" && path === "/api/status") {
      let omni: any; try { omni = { connected: true, parameters: await getOmni() }; } catch { omni = { connected: false }; }
      return sendJson(res, { omni, ffmpeg: binaryAvailable("ffmpeg") && binaryAvailable("ffprobe"), ai: { provider: aiSettings.provider, baseUrl: aiSettings.baseUrl, model: aiSettings.model, hasKey: !!aiSettings.apiKey } });
    }
    if (req.method === "GET" && path === "/api/jobs") return sendJson(res, [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30));
    if (req.method === "GET" && path.startsWith("/api/jobs/")) { const job = jobs.get(idSchema.parse(path.split("/").pop())); return sendJson(res, job || { error: "Không tìm thấy tác vụ." }, job ? 200 : 404); }
    if (req.method === "POST" && path === "/api/settings") {
      const body = z.object({ provider: z.enum(["codex", "api"]), baseUrl: z.string().url(), model: z.string().max(120), apiKey: z.string().max(2000).optional(), clearKey: z.boolean().optional() }).parse(await jsonBody(req));
      const parsed = new URL(body.baseUrl); if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password) throw new Error("API endpoint không hợp lệ.");
      const next = AiSettingsSchema.parse({ ...body, apiKey: body.clearKey ? "" : body.apiKey || aiSettings.apiKey });
      await writeFile(settingsFile, JSON.stringify(next, null, 2)); aiSettings = next;
      return sendJson(res, { saved: true, hasKey: !!next.apiKey });
    }
    if (req.method === "POST" && path === "/api/upload") {
      const body = z.object({ mime: z.string(), data: z.string().max(28 * 1024 * 1024), name: z.string().max(240) }).parse(await jsonBody(req));
      const bytes = Buffer.from(body.data, "base64"); if (!bytes.length || bytes.length > 20 * 1024 * 1024) throw new Error("Tệp phải từ 1 byte đến 20 MB.");
      const head = bytes.subarray(0, 16);
      const valid = body.mime === "image/jpeg" ? head[0] === 255 && head[1] === 216 : body.mime === "image/png" ? head.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : body.mime === "image/gif" ? head.toString().startsWith("GIF8") : body.mime === "image/webp" ? head.toString().startsWith("RIFF") && head.toString().includes("WEBP") : ["audio/wav", "audio/x-wav"].includes(body.mime) ? head.toString().startsWith("RIFF") && head.toString().includes("WAVE") : body.mime === "audio/mpeg" ? head.toString().startsWith("ID3") || (head[0] === 255 && (head[1] & 224) === 224) : ["audio/mp4", "audio/x-m4a"].includes(body.mime) ? head.toString().includes("ftyp") : body.mime === "audio/ogg" && head.toString().startsWith("OggS");
      if (!valid) throw new Error("Định dạng tệp không khớp. Dùng JPG/PNG/WebP/GIF hoặc WAV/MP3/M4A/OGG.");
      return sendJson(res, { ...await storeMedia(bytes, body.mime), name: body.name });
    }
    if (req.method === "POST" && path === "/api/article") {
      const body = z.object({ url: z.string().url().max(2000) }).parse(await jsonBody(req));
      const job = startJob("article", async job => {
        job.message = "Đang đọc bài viết…"; job.sourceUrl = body.url;
        const source = await fetchPublic(body.url, "html"); const article = parseArticle(source.bytes.toString("utf8"), source.url);
        job.progress = 25; job.message = "Đang tải ảnh từ bài viết…";
        const images: any[] = []; let failed = 0;
        // Bounded parallel downloads, retaining publisher order.
        for (let i = 0; i < article.images.length; i += 4) {
          const batch = await Promise.all(article.images.slice(i, i + 4).map(async img => {
            try { const asset = await fetchPublic(img.url, "image", article.url); return { ...await storeMedia(asset.bytes, asset.mime), alt: img.alt, credit: article.domain, originalUrl: img.url }; }
            catch { failed++; return null; }
          }));
          images.push(...batch.filter(Boolean)); job.progress = 25 + Math.round(70 * Math.min(i + 4, article.images.length) / article.images.length);
        }
        return { article, images, warning: failed ? `${failed} ảnh không tải được từ nguồn. Bạn có thể tải ảnh lên thêm.` : "" };
      }); return sendJson(res, { id: job.id }, 202);
    }
    if (req.method === "POST" && path === "/api/script") {
      const body = z.object({ article: z.object({ url: z.string().max(2000), title: z.string().max(240), domain: z.string().max(100), publishedAt: z.string().max(32), text: z.string().min(120).max(35000), images: z.array(z.object({ url: z.string(), alt: z.string().max(180) })).max(30) }), language: z.enum(["Vietnamese", "English"]), duration: z.number().min(15).max(180), direction: z.string().max(1500) }).parse(await jsonBody(req));
      const settingsSnapshot = { ...aiSettings };
      const job = startJob("script", async job => { job.message = "AI đang viết kịch bản từ bài viết…"; job.progress = 20;
        return generateDraft(body.article as Article, body, join(storage, `ai-${job.id}`), settingsSnapshot); });
      return sendJson(res, { id: job.id }, 202);
    }
    if (req.method === "POST" && path === "/api/voice") {
      const body = z.object({ voice: voiceSchema, text: z.string().min(1).max(1500) }).parse(await jsonBody(req));
      await validateVoice(body.voice);
      const job = startJob("voice", async job => {
        job.message = "OmniVoice đang tạo mẫu giọng…"; job.progress = 20;
        const voice = body.voice; const referenceId = voice.mode === "clone" ? voice.referenceId! : `${randomUUID()}.wav`;
        const referenceText = voice.mode === "clone" ? voice.referenceText : body.text;
        const client = new OmniVoiceClient({ endpoint });
        await client.prepareVoice({ audioPath: mediaPath(referenceId), text: referenceText, speed: voice.speed, language: voice.language, settings: voice.settings, explicitReference: voice.mode === "clone" });
        const audioId = `${randomUUID()}.wav`; job.progress = 60; job.message = "Đang tổng hợp đoạn nghe thử…";
        await client.generate(body.text, mediaPath(audioId));
        return { src: mediaUrl(audioId), referenceId, referenceText, fingerprint: fingerprint(voice) };
      }); return sendJson(res, { id: job.id }, 202);
    }
    if (req.method === "POST" && path === "/api/render") {
      const body = z.object({ script: z.unknown(), voice: voiceSchema, previewJobId: z.string().uuid().optional(), sceneImages: z.array(z.array(imageRef).max(6)).min(3).max(12) }).parse(await jsonBody(req));
      const script = TemplateScriptSchema.parse(body.script);
      await validateVoice(body.voice);
      if (!binaryAvailable("ffmpeg") || !binaryAvailable("ffprobe")) throw new Error("Chưa tìm thấy FFmpeg/ffprobe. Cài FFmpeg hoặc đặt FFMPEG_DIR trong .env.local rồi khởi động lại.");
      if (body.sceneImages.length !== script.scenes.length) throw new Error("Danh sách ảnh không khớp với số cảnh.");
      if (new Set(script.scenes.map(s => s.id)).size !== script.scenes.length) throw new Error("ID cảnh không được trùng nhau.");
      script.scenes.forEach((scene, i) => {
        if (!/^[a-zA-Z0-9_-]{1,64}$/.test(scene.id)) throw new Error("Cảnh không hợp lệ.");
        const template = getTemplate(scene.templateId, script.aspect);
        const seed = TemplateSeedSchema.parse({ headline: scene.inputs.headline, summary: scene.inputs.summary ?? "", channel: script.metadata.channel, source: script.metadata.source.domain === "local" ? "" : script.metadata.source.domain, date: script.metadata.publishedAt ?? "", theme: scene.inputs.theme ?? "slide", locale: body.voice.language === "English" ? "en" : "vi", section: `Bản tin / ${String(i + 1).padStart(2, "0")}` });
        scene.inputs = buildTemplateInputs(scene.templateId, seed, scene.inputs.studioFields ?? {}, true).inputs;
        // Media and reference paths are resolved only from managed asset IDs.
        if (template.images) scene.inputs.images = body.sceneImages[i].map(img => ({ src: mediaPath(img.id), alt: img.alt, credit: img.credit }));
        scene.sfx = { name: "none", volume: 0, startOffsetSec: 0 };
        if (template.images) resolveNewsInputs(script, scene, i);
      });
      const preview = body.previewJobId ? jobs.get(body.previewJobId) : undefined;
      const reuse = preview?.kind === "voice" && preview.status === "done" && preview.result?.fingerprint === fingerprint(body.voice) ? preview.result : null;
      script.voice = { provider: "omnivoice", speed: body.voice.speed, language: body.voice.language, settings: body.voice.settings };
      const referenceId = reuse?.referenceId || (body.voice.mode === "clone" ? body.voice.referenceId : undefined);
      const referenceText = reuse?.referenceText ?? body.voice.referenceText;
      const job = startJob("render", async job => {
        const directory = join(output, `studio-${job.id}`); await mkdir(directory, { recursive: true });
        for (const scene of script.scenes) {
          for (const img of (scene.inputs.images as any[] ?? [])) {
            const name = img.src.split(/[\\/]/).pop(); await copyFile(img.src, join(directory, name)); img.src = name;
          }
        }
        if (referenceId) { const name = `reference${extname(referenceId)}`; await copyFile(mediaPath(referenceId), join(directory, name)); script.voice.referenceAudio = name; if (referenceText) script.voice.referenceText = referenceText; }
        // Avoid remote fallback images. All selected images are now local to this render.
        script.metadata.source.image = null;
        await writeFile(join(directory, "script.json"), JSON.stringify(script, null, 2));
        job.message = "Đang tạo giọng đọc và dựng video…";
        await new Promise<void>((resolveJob, reject) => {
          const child = spawn(process.execPath, ["--import", "tsx", join(root, "src/cli.ts"), join(directory, "script.json")], { cwd: root, windowsHide: true, env: { ...process.env, OMNIVOICE_ENDPOINT: endpoint }, stdio: ["ignore", "pipe", "pipe"] });
          const consume = (chunk: Buffer) => {
            const text = chunk.toString().replace(/\x1b\[[0-9;]*m/g, "");
            job.logs.push(...text.split(/\r?\n/).filter(Boolean)); job.logs = job.logs.slice(-100);
            const match = text.match(/\[(\d)\/8\]/); if (match) job.progress = Math.max(job.progress, Math.min(95, Number(match[1]) * 11));
            if (/TTS scene/.test(text)) job.message = "OmniVoice đang đọc từng cảnh…";
            if (/Compose|Render template/.test(text)) { job.message = "Đang dựng hình và chuyển cảnh…"; job.progress = Math.max(job.progress, 60); }
            if (/Concat clips|mux audio/.test(text)) { job.message = "Đang ghép video và âm thanh…"; job.progress = 90; }
          };
          const timeout = setTimeout(() => { child.kill(); reject(new Error("Render quá thời gian 45 phút. Kiểm tra nhật ký và thử lại.")); }, 45 * 60000);
          child.stdout.on("data", consume); child.stderr.on("data", consume);
          child.on("error", error => { clearTimeout(timeout); reject(error); });
          child.on("close", code => { clearTimeout(timeout); code === 0 ? resolveJob() : reject(new Error(`Render thất bại (mã ${code}). Xem nhật ký để biết chi tiết.`)); });
        });
        await stat(join(directory, "video.mp4"));
        return { video: `/results/${job.id}/video.mp4`, audio: `/results/${job.id}/voice.mp3`, script: `/results/${job.id}/script.txt`, json: `/results/${job.id}/script.json`, title: script.metadata.title };
      }); return sendJson(res, { id: job.id }, 202);
    }
    if (req.method === "GET") {
      if (/^\/media\/[a-f0-9-]+\.(jpg|png|gif|webp|wav|mp3|m4a|ogg)$/.test(path)) return await serveFile(req, res, mediaPath(path.split("/").pop()!));
      const result = path.match(/^\/results\/([a-f0-9-]+)\/(video\.mp4|voice\.mp3|script\.txt|script\.json)$/);
      if (result) return await serveFile(req, res, join(output, `studio-${idSchema.parse(result[1])}`, result[2]));
      if (["/", "/app.js", "/style.css"].includes(path)) return await serveFile(req, res, join(root, "studio", path === "/" ? "index.html" : path.slice(1)));
      if (path.startsWith("/template-assets/")) {
        const parts = path.slice("/template-assets/".length).split("/");
        const id = parts.shift()!; getTemplate(id);
        if (!parts.length || parts.some(part => !part || part === ".." || part.includes("\\") || part.includes(":")) || !/\.(html|css|js|svg|png|jpg|woff2?)$/.test(parts.join("/"))) throw new Error("Tệp template không hợp lệ.");
        return await serveFile(req, res, join(root, "templates", id, ...parts));
      }
      if (path.startsWith("/templates/")) {
        const rel = path.slice("/templates/".length); if (!rel.split("/").some(p => p === ".." || p.includes("\\")) && /\.(html|css|js|svg)$/.test(rel)) return await serveFile(req, res, join(root, "templates/frame-news", rel));
      }
    }
    sendJson(res, { error: "Không tìm thấy." }, 404);
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues.map(i => `${i.path.join(".")}: ${i.message}`).slice(0, 4).join("; ") : axios.isAxiosError(error) ? `Không kết nối được dịch vụ (${error.response?.status || error.code}). Hãy kiểm tra link hoặc máy chủ.` : error instanceof Error ? error.message : "Có lỗi xảy ra.";
    if (!res.headersSent) sendJson(res, { error: message }, 400); else res.destroy();
  }
});
server.listen(port, "127.0.0.1", () => console.log(`Newsroom Studio: http://127.0.0.1:${port}`));
