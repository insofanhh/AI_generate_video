import axios, { AxiosError } from "axios";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename } from "node:path";
import { createHash } from "node:crypto";
import type { TtsClient } from "./tts-client.js";

export interface OmniVoiceOpts {
  endpoint: string; // e.g. "http://127.0.0.1:8123"
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// OmniVoice local TTS: POST { text } → audio/mpeg bytes.
// No API key or voice ID — configured server-side.
// srtOutPath is ignored (no subtitle support).
export class OmniVoiceClient implements TtsClient {
  private reference?: { path: string; text: string };
  private speed = 1;
  constructor(private cfg: OmniVoiceOpts) {}

  async prepareVoice(options: { audioPath: string; text: string; speed: number; explicitReference: boolean }): Promise<string> {
    this.speed = options.speed;
    let info;
    try {
      info = await axios.get(`${this.cfg.endpoint}/gradio_api/info`, { timeout: 10000 });
    } catch (error) {
      if ((error as AxiosError).response?.status !== 404) throw error;
      if (options.explicitReference) throw new Error("This OmniVoice REST server does not expose reference-voice cloning.");
      // A REST /tts server owns its fixed voice configuration.
      return `rest-configured:${this.cfg.endpoint}`;
    }
    if (!info.data?.named_endpoints?.["/_clone_fn"]) {
      throw new Error("OmniVoice must expose /_clone_fn to keep one narrator across scenes.");
    }
    if (this.speed > 1.5) throw new Error("OmniVoice Gradio supports voice.speed from 0.5 to 1.5.");
    if (!existsSync(options.audioPath)) {
      if (options.explicitReference) throw new Error(`Voice reference not found: ${options.audioPath}`);
      // Design exactly one synthetic voice. Every scene is subsequently cloned
      // from this saved reference, including after a resumed pipeline run.
      await this.generateViaGradio(options.text, options.audioPath);
    }
    const bytes = await readFile(options.audioPath);
    const form = new FormData();
    form.append("files", new Blob([new Uint8Array(bytes)]), basename(options.audioPath));
    const uploaded = await axios.post(`${this.cfg.endpoint}/gradio_api/upload`, form, { timeout: 30000 });
    const path = uploaded.data?.[0];
    if (typeof path !== "string" || !path) throw new Error("OmniVoice did not return an uploaded voice reference.");
    this.reference = { path, text: options.text };
    return createHash("sha256").update(bytes).update(options.text).update(String(this.speed)).digest("hex");
  }

  async generate(text: string, audioOutPath: string, _srtOutPath?: string): Promise<void> {
    const delays = [1000, 2000, 4000];
    let lastErr: unknown;

    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        if (this.reference) {
          // Do not fall back to voice design if cloning fails: that changes speaker.
          await this.generateViaGradio(text, audioOutPath);
          return;
        }
        // 1. Try standard REST /tts endpoint first
        try {
          const resp = await axios.post<ArrayBuffer>(
            `${this.cfg.endpoint}/tts`,
            { text },
            { headers: { "Content-Type": "application/json", Accept: "audio/mpeg" }, responseType: "arraybuffer", timeout: 60000 },
          );
          await writeFile(audioOutPath, Buffer.from(resp.data));
          return;
        } catch (e) {
          const status = (e as AxiosError).response?.status;
          // If status is 404 or endpoint is Gradio WebUI, fall back to Gradio API
          if (status === 404 || (e as AxiosError).code === "ERR_BAD_REQUEST") {
            await this.generateViaGradio(text, audioOutPath);
            return;
          }
          throw e;
        }
      } catch (e) {
        lastErr = e;
        const status = (e as AxiosError).response?.status;
        if (status !== undefined && status < 500 && status !== 429 && status !== 404) {
          throw new Error(`OmniVoice TTS failed (status ${status})`);
        }
        if (attempt < delays.length) await sleep(delays[attempt]);
      }
    }
    throw lastErr;
  }

  private async generateViaGradio(text: string, audioOutPath: string): Promise<void> {
    const apiName = this.reference ? "_clone_fn" : "_design_fn";
    const data = this.reference ? [
      text, "Vietnamese",
      { path: this.reference.path, meta: { _type: "gradio.FileData" } },
      this.reference.text, "", 32, 2, true, this.speed, null, true, true,
    ] : [
        text,         // Text to synthesize
        "Vietnamese", // Language
        32,           // Inference steps
        2,            // Guidance Scale (CFG)
        true,         // Denoise
        this.speed,   // Speed
        null,         // Duration
        true,         // Preprocess Prompt
        true,         // Postprocess Output
        "Auto",       // Gender
        "Auto",       // Age
        "Auto",       // Pitch
        "Auto",       // Style
        "Auto",       // Accent
        "Auto"        // Dialect
      ];
    const callRes = await axios.post(`${this.cfg.endpoint}/gradio_api/call/${apiName}`, { data }, { timeout: 30000 });

    const eventId = callRes.data?.event_id;
    if (!eventId) {
      throw new Error("Gradio call returned no event_id");
    }

    const sseRes = await axios.get(`${this.cfg.endpoint}/gradio_api/call/${apiName}/${eventId}`, {
      responseType: "text",
      timeout: 300000
    });

    const lines = sseRes.data.split("\n");
    let fileUrl: string | null = null;
    if (/^event:\s*error\s*$/m.test(sseRes.data)) {
      throw new Error(`OmniVoice ${apiName} failed: ${sseRes.data.slice(0, 500)}`);
    }

    for (const line of lines) {
      if (line.startsWith("data:")) {
        const jsonStr = line.slice(5).trim();
        try {
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed) && parsed[0]?.url) {
            fileUrl = parsed[0].url;
          } else if (Array.isArray(parsed) && parsed[0]?.path) {
            fileUrl = `${this.cfg.endpoint}/gradio_api/file=${encodeURIComponent(parsed[0].path)}`;
          }
        } catch {
          // ignore non-json event lines
        }
      }
    }

    if (!fileUrl) {
      throw new Error("Gradio TTS completed but no audio file URL found in response");
    }

    const audioRes = await axios.get<ArrayBuffer>(fileUrl, {
      responseType: "arraybuffer",
      timeout: 30000
    });

    await writeFile(audioOutPath, Buffer.from(audioRes.data));
  }
}
