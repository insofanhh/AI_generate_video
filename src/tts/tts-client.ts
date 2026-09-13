/**
 * Common TTS client interface. OmniVoice is the only provider; the interface
 * is kept so the pipeline orchestration stays decoupled from the implementation.
 */
export interface TtsClient {
  /** Prepare a shared synthetic narrator before generating any scene. */
  prepareVoice?(options: {
    audioPath: string;
    text: string;
    speed: number;
    language?: "Vietnamese" | "English";
    explicitReference: boolean;
    settings?: import("./voice-settings.js").VoiceSettings;
  }): Promise<string>;
  /**
   * Generate speech audio for `text` and write to `audioOutPath` (mp3 or wav).
   * If `srtOutPath` is provided AND the provider supports subtitles,
   * write the SRT to that path. Otherwise silently skip.
   */
  generate(text: string, audioOutPath: string, srtOutPath?: string): Promise<void>;
}

import type { Config } from "../config.js";
import { OmniVoiceClient } from "./omnivoice-client.js";

export function createTtsClient(cfg: Config): TtsClient {
  return new OmniVoiceClient({ endpoint: cfg.omnivoiceEndpoint });
}
