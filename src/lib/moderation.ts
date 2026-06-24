import { env, isMockMode } from "@/lib/config";

const localBlockedTerms = [
  "celebrity voice",
  "without permission",
  "minor sexual",
  "suicide instructions",
  "terrorist propaganda"
];

export async function moderateText(text: string) {
  if (isMockMode || !env.OPENAI_API_KEY) {
    const normalized = text.toLowerCase();
    return { allowed: !localBlockedTerms.some((term) => normalized.includes(term)) };
  }
  const response = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ model: "omni-moderation-latest", input: text }),
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`Moderation failed: ${response.status}`);
  const data = (await response.json()) as { results?: Array<{ flagged?: boolean }> };
  return { allowed: data.results?.[0]?.flagged !== true };
}
