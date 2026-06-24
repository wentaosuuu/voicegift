import { z } from "zod";

const serverSchema = z.object({
  APP_MODE: z.enum(["mock", "live"]).default("mock"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  APP_ENCRYPTION_KEY: z.string().min(32).default("mock-encryption-key-with-32-characters"),
  PROJECT_ACCESS_PEPPER: z.string().min(16).default("mock-project-access-pepper"),
  PROVIDER_WEBHOOK_SECRET: z.string().min(16).default("mock-provider-webhook-secret"),
  CRON_SECRET: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  SUPABASE_AUDIO_BUCKET: z.string().default("voicegift-private"),
  NEXT_PUBLIC_PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYPAL_ENV: z.enum(["sandbox", "live"]).default("sandbox"),
  PAYPAL_CURRENCY: z.string().default("USD"),
  PAYPAL_PRICE: z.coerce.number().positive().default(9.99),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_LYRICS_MODEL: z.string().default("gpt-5-mini"),
  MEDIA_PROVIDER: z.enum(["bridge", "elevenlabs"]).default("bridge"),
  MEDIA_PROVIDER_BASE_URL: z.string().url().optional(),
  MEDIA_PROVIDER_API_KEY: z.string().optional(),
  MEDIA_PROVIDER_MUSIC_PATH: z.string().default("/v1/music"),
  MEDIA_PROVIDER_VOICE_PATH: z.string().default("/v1/voice-conversion"),
  MEDIA_PROVIDER_VIDEO_PATH: z.string().default("/v1/lyric-video"),
  MEDIA_PROVIDER_VERIFY_PATH: z.string().default("/v1/verify-voice"),
  ELEVENLABS_API_KEY: z.string().optional(),
  ELEVENLABS_MUSIC_MODEL_ID: z.string().default("music_v1"),
  ELEVENLABS_SPEECH_TO_SPEECH_MODEL_ID: z.string().default("eleven_multilingual_sts_v2"),
  ELEVENLABS_SPEECH_TO_TEXT_MODEL_ID: z.string().default("scribe_v1"),
  ELEVENLABS_OUTPUT_FORMAT: z.string().default("mp3_44100_128"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("VoiceGift <songs@example.com>"),
  ADMIN_EMAILS: z.string().default("")
});

export const env = serverSchema.parse(process.env);
export const isMockMode = env.APP_MODE === "mock";
export const isElevenLabsProvider =
  env.MEDIA_PROVIDER === "elevenlabs" || Boolean(env.ELEVENLABS_API_KEY && !env.MEDIA_PROVIDER_API_KEY);
export const supabaseUrl = normalizeSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL);

export function assertLiveConfiguration() {
  if (isMockMode) return;
  const missing = [
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "NEXT_PUBLIC_PAYPAL_CLIENT_ID",
    "PAYPAL_CLIENT_SECRET",
    "OPENAI_API_KEY",
    isElevenLabsProvider ? "ELEVENLABS_API_KEY" : "MEDIA_PROVIDER_BASE_URL",
    isElevenLabsProvider ? null : "MEDIA_PROVIDER_API_KEY",
    "APP_ENCRYPTION_KEY",
    "PROJECT_ACCESS_PEPPER",
    "PROVIDER_WEBHOOK_SECRET"
  ].filter((key): key is string => Boolean(key)).filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing live configuration: ${missing.join(", ")}`);
}

function normalizeSupabaseUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.hostname.endsWith(".supabase.co") && url.pathname === "/") return url.toString().replace(/\/$/, "");
    const dashboardMatch = url.pathname.match(/\/project\/([a-z0-9]{20})/i);
    if (url.hostname === "supabase.com" && dashboardMatch?.[1]) {
      return `https://${dashboardMatch[1]}.supabase.co`;
    }
    return url.origin;
  } catch {
    return value;
  }
}
