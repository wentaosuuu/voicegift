import { env } from "@/lib/config";
import type { GenerationKind, Project } from "@/types/domain";

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io";

type ElevenLabsVoice = {
  voice_id?: string;
  voiceId?: string;
};

type ElevenLabsError = {
  detail?: unknown;
  message?: string;
  error?: string;
};

function requireApiKey() {
  if (!env.ELEVENLABS_API_KEY) throw new Error("ElevenLabs API key is not configured");
  return env.ELEVENLABS_API_KEY;
}

function headers() {
  return { "xi-api-key": requireApiKey() };
}

function durationSeconds(kind: GenerationKind) {
  return kind === "preview" ? 15 : 75;
}

function musicPrompt(project: Project, kind: GenerationKind) {
  const occasion = project.occasion.replaceAll("_", " ");
  return [
    `Create an original ${durationSeconds(kind)} second personal song gift.`,
    `Recipient first name: ${project.recipient_name}.`,
    `Occasion: ${occasion}.`,
    `Style direction: ${project.music_style}.`,
    `Memory and details: ${project.memory}.`,
    project.message ? `Short message to include emotionally: ${project.message}.` : null,
    project.lyrics ? `Use these original lyrics as the main lyrical direction:\n${project.lyrics}` : null,
    "Do not imitate any famous artist, copyrighted song, or existing melody.",
    "Make it warm, shareable, emotionally clear, and suitable for a short social media gift."
  ]
    .filter(Boolean)
    .join("\n");
}

async function readError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = (await response.json().catch(() => null)) as ElevenLabsError | null;
    return data?.message ?? data?.error ?? JSON.stringify(data?.detail ?? data);
  }
  return await response.text().catch(() => "");
}

async function expectAudio(response: Response, label: string) {
  if (!response.ok) {
    const message = await readError(response);
    throw new Error(`${label} failed: ${response.status}${message ? ` ${message}` : ""}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = (await response.json()) as { audio_url?: string; url?: string };
    const url = data.audio_url ?? data.url;
    if (!url) throw new Error(`${label} returned JSON without an audio URL`);
    const audio = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (!audio.ok) throw new Error(`${label} audio download failed: ${audio.status}`);
    return await audio.arrayBuffer();
  }
  return await response.arrayBuffer();
}

async function fetchAudio(url: string, label: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`${label} download failed: ${response.status}`);
  return {
    bytes: await response.arrayBuffer(),
    contentType: response.headers.get("content-type") ?? "audio/webm"
  };
}

export async function transcribeWithElevenLabs(input: { audioUrl: string }) {
  const source = await fetchAudio(input.audioUrl, "Voice sample");
  const form = new FormData();
  form.append("model_id", env.ELEVENLABS_SPEECH_TO_TEXT_MODEL_ID);
  form.append("file", new Blob([source.bytes], { type: source.contentType }), "voice-sample.webm");

  const response = await fetch(`${ELEVENLABS_BASE_URL}/v1/speech-to-text`, {
    method: "POST",
    headers: headers(),
    body: form,
    signal: AbortSignal.timeout(120000)
  });
  if (!response.ok) {
    const message = await readError(response);
    throw new Error(`ElevenLabs speech-to-text failed: ${response.status}${message ? ` ${message}` : ""}`);
  }
  const data = (await response.json()) as { text?: string };
  return data.text ?? "";
}

export async function composeMusicWithElevenLabs(input: { project: Project; kind: GenerationKind }) {
  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/v1/music?output_format=${encodeURIComponent(env.ELEVENLABS_OUTPUT_FORMAT)}`,
    {
      method: "POST",
      headers: {
        ...headers(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: musicPrompt(input.project, input.kind),
        music_length_ms: durationSeconds(input.kind) * 1000,
        model_id: env.ELEVENLABS_MUSIC_MODEL_ID
      }),
      signal: AbortSignal.timeout(240000)
    }
  );
  return expectAudio(response, "ElevenLabs music generation");
}

export async function createElevenLabsVoice(input: { projectId: string; voiceUrl: string }) {
  const source = await fetchAudio(input.voiceUrl, "Voice sample");
  const form = new FormData();
  form.append("name", `voicegift-${input.projectId}`);
  form.append("description", "Temporary one-project VoiceGift voice clone from verified user recording.");
  form.append("remove_background_noise", "true");
  form.append("files", new Blob([source.bytes], { type: source.contentType }), "voice-sample.webm");

  const response = await fetch(`${ELEVENLABS_BASE_URL}/v1/voices/add`, {
    method: "POST",
    headers: headers(),
    body: form,
    signal: AbortSignal.timeout(240000)
  });
  if (!response.ok) {
    const message = await readError(response);
    throw new Error(`ElevenLabs voice clone failed: ${response.status}${message ? ` ${message}` : ""}`);
  }
  const data = (await response.json()) as ElevenLabsVoice;
  const voiceId = data.voice_id ?? data.voiceId;
  if (!voiceId) throw new Error("ElevenLabs voice clone returned no voice id");
  return voiceId;
}

export async function convertSpeechWithElevenLabs(input: { voiceId: string; sourceAudio: ArrayBuffer }) {
  const form = new FormData();
  form.append("model_id", env.ELEVENLABS_SPEECH_TO_SPEECH_MODEL_ID);
  form.append("audio", new Blob([input.sourceAudio], { type: "audio/mpeg" }), "guide-song.mp3");
  form.append("voice_settings", JSON.stringify({ stability: 0.45, similarity_boost: 0.75, style: 0.25 }));

  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/v1/speech-to-speech/${encodeURIComponent(input.voiceId)}/stream?output_format=${encodeURIComponent(env.ELEVENLABS_OUTPUT_FORMAT)}`,
    {
      method: "POST",
      headers: headers(),
      body: form,
      signal: AbortSignal.timeout(240000)
    }
  );
  return expectAudio(response, "ElevenLabs speech-to-speech");
}

export async function deleteElevenLabsVoice(voiceId: string) {
  await fetch(`${ELEVENLABS_BASE_URL}/v1/voices/${encodeURIComponent(voiceId)}`, {
    method: "DELETE",
    headers: headers(),
    signal: AbortSignal.timeout(30000)
  }).catch(() => null);
}
