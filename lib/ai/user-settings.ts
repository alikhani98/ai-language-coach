import "server-only";

import { createHash, createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { z } from "zod";

const VERSION = "v1";
const encryptionKeySchema = z.string().refine((value) => {
  if (/^[0-9a-f]{64}$/i.test(value)) return true;
  try { return Buffer.from(value, "base64").length === 32; } catch { return false; }
}, "ZABAN_AI_ENCRYPTION_KEY must encode exactly 32 bytes.");

function masterKey() {
  const value = process.env.ZABAN_AI_ENCRYPTION_KEY;
  if (!value) throw new Error("AI settings encryption is not configured.");
  const parsed = encryptionKeySchema.parse(value);
  return /^[0-9a-f]{64}$/i.test(parsed) ? Buffer.from(parsed, "hex") : Buffer.from(parsed, "base64");
}

export function encryptUserApiKey(apiKey: string, appUserId: string, provider = "openrouter") {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const aad = Buffer.from(`${VERSION}:${appUserId}:${provider}`, "utf8");
  cipher.setAAD(aad);
  const ciphertext = Buffer.concat([cipher.update(apiKey, "utf8"), cipher.final()]);
  return `${VERSION}.${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}`;
}

export function decryptUserApiKey(payload: string, appUserId: string, provider = "openrouter") {
  const [version, ivText, tagText, ciphertextText] = payload.split(".");
  if (version !== VERSION || !ivText || !tagText || !ciphertextText) throw new Error("Invalid encrypted AI key.");
  try {
    const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(ivText, "base64url"));
    decipher.setAAD(Buffer.from(`${VERSION}:${appUserId}:${provider}`, "utf8"));
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64url")), decipher.final()]).toString("utf8");
  } catch { throw new Error("Invalid encrypted AI key."); }
}

export function fingerprintUserApiKey(apiKey: string) { return createHash("sha256").update(apiKey).digest("hex"); }
export function lastFourUserApiKey(apiKey: string) { return apiKey.slice(-4).padStart(4, "•"); }
export function assertEncryptionConfigured() { masterKey(); }
