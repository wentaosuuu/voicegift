import { env, isMockMode } from "@/lib/config";
import type { Project } from "@/types/domain";
import { moderateText } from "@/lib/moderation";

export async function generateLyrics(project: Project) {
  if (isMockMode || !env.OPENAI_API_KEY) {
    return fallbackLyrics(project);
  }
  try {
    const prompt = [
      "Write original, singable lyrics for a 60-90 second personal gift song.",
      `Recipient: ${project.recipient_name}`,
      `Occasion: ${project.occasion}`,
      `Style: ${project.music_style}`,
      `Memory: ${project.memory}`,
      `Message: ${project.message ?? ""}`,
      "Requirements: warm, specific, not embarrassing, no copyrighted lyric references, no living artist imitation.",
      "Return only lyrics with [Verse] and [Chorus] labels."
    ].join("\n");
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model: env.OPENAI_LYRICS_MODEL, input: prompt }),
      signal: AbortSignal.timeout(60000)
    });
    const data = (await response.json()) as {
      output_text?: string;
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    };
    if (!response.ok) throw new Error(`Lyrics generation failed: ${response.status}`);
    const text =
      data.output_text ??
      data.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!text) throw new Error("Lyrics provider returned no text");
    const lyrics = text.slice(0, 5000);
    if (!(await moderateText(lyrics)).allowed) throw new Error("Generated lyrics failed safety review");
    return lyrics;
  } catch (error) {
    console.warn("lyrics provider skipped; using fallback lyrics", error);
    return fallbackLyrics(project);
  }
}

function fallbackLyrics(project: Project) {
  return `[Verse]\n${project.recipient_name}, today the whole room knows your name\nA little more laughter, but somehow still the same\n\n[Chorus]\nHere’s to the stories only we could ever tell\nThe missed turns, late nights, and knowing you so well\n${project.recipient_name}, this one is yours today\nMay every year keep finding you this way`;
}
