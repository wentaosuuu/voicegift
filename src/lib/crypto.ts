import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual
} from "node:crypto";
import { env } from "@/lib/config";

export function createOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function hashAccessToken(token: string) {
  return createHash("sha256").update(`${env.PROJECT_ACCESS_PEPPER}:${token}`).digest("hex");
}

export function secureTokenMatch(token: string, storedHash: string) {
  const actual = Buffer.from(hashAccessToken(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createShareSlug() {
  return randomBytes(12).toString("base64url");
}

function encryptionKey() {
  return createHash("sha256").update(env.APP_ENCRYPTION_KEY).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString("base64url")).join(".");
}

export function decryptSecret(value: string) {
  const [ivPart, tagPart, cipherPart] = value.split(".");
  if (!ivPart || !tagPart || !cipherPart) throw new Error("Invalid encrypted value");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(cipherPart, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

export function createVoiceChallenge() {
  const words = ["violet", "harbor", "lantern", "meadow", "silver", "comet"];
  const word = words[Math.floor(Math.random() * words.length)];
  const phrase = `I am creating this VoiceGift with my own voice. ${word} ${Math.floor(100 + Math.random() * 900)}.`;
  const payload = Buffer.from(JSON.stringify({ phrase, exp: Date.now() + 10 * 60_000 })).toString("base64url");
  const signature = createHmac("sha256", env.PROVIDER_WEBHOOK_SECRET).update(payload).digest("base64url");
  return { phrase, token: `${payload}.${signature}` };
}

export function verifyVoiceChallenge(token: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new Error("Invalid voice challenge");
  const expected = createHmac("sha256", env.PROVIDER_WEBHOOK_SECRET).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error("Invalid voice challenge signature");
  }
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    phrase: string;
    exp: number;
  };
  if (Date.now() > parsed.exp) throw new Error("Voice challenge expired");
  return parsed.phrase;
}
