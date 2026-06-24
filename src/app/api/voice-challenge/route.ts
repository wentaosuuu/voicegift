import { createVoiceChallenge } from "@/lib/crypto";
import { noStoreJson } from "@/lib/http";

export async function GET() {
  return noStoreJson(createVoiceChallenge());
}
