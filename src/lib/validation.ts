import { z } from "zod";

export const createProjectSchema = z.object({
  recipientName: z.string().trim().min(1).max(60),
  occasion: z.enum(["birthday", "anniversary", "friendship", "just_because"]),
  memory: z.string().trim().min(10).max(1500),
  message: z.string().trim().max(500).optional().default(""),
  musicStyle: z.enum(["warm_pop", "acoustic", "playful_rap", "dreamy"]),
  customerEmail: z.string().email().max(254),
  consent: z.literal(true),
  turnstileToken: z.string().optional()
});

export const uploadRequestSchema = z.object({
  fileName: z.string().min(1).max(160),
  contentType: z.enum([
    "audio/mpeg",
    "audio/mp4",
    "audio/x-m4a",
    "audio/wav",
    "audio/webm",
    "audio/ogg"
  ]),
  size: z.number().int().positive().max(20 * 1024 * 1024)
});

export const providerWebhookSchema = z.object({
  projectId: z.string().uuid(),
  kind: z.enum(["preview", "full"]),
  stage: z.enum(["music", "voice", "video"]),
  providerJobId: z.string().min(1),
  status: z.enum(["succeeded", "failed"]),
  outputUrl: z.string().url().optional(),
  error: z.string().max(1000).optional()
});

export const voiceCompleteSchema = z.object({
  path: z.string().min(1).max(500),
  challengeToken: z.string().min(20).max(1000)
});
