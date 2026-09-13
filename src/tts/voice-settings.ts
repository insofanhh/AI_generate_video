import { z } from "zod";

export const VoiceSettingsSchema = z.object({
  instruct: z.string().max(500).default(""),
  steps: z.number().int().min(4).max(64).default(32),
  guidance: z.number().min(0).max(4).default(2),
  denoise: z.boolean().default(true),
  duration: z.number().positive().max(120).nullable().default(null),
  preprocess: z.boolean().default(true),
  postprocess: z.boolean().default(true),
  gender: z.string().max(100).default("Auto"),
  age: z.string().max(100).default("Auto"),
  pitch: z.string().max(100).default("Auto"),
  style: z.string().max(100).default("Auto"),
  accent: z.string().max(100).default("Auto"),
  dialect: z.string().max(100).default("Auto"),
});
export type VoiceSettings = z.infer<typeof VoiceSettingsSchema>;
