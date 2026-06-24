import { env, isMockMode } from "@/lib/config";

export async function sendEmail(input: { to: string; subject: string; html: string }) {
  if (isMockMode || !env.RESEND_API_KEY) {
    console.info("[email:mock]", input.subject, input.to);
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, ...input }),
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`Email delivery failed: ${response.status}`);
}
