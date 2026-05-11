import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "@/lib/env";

const ALGO = "aes-256-gcm";
const KEY = Buffer.from(env.CREDENTIALS_ENCRYPTION_KEY, "hex");

if (KEY.length !== 32) {
  throw new Error("Invalid CREDENTIALS_ENCRYPTION_KEY length for AES-256-GCM.");
}

export type EncryptedCredential = {
  ciphertext: string;
  iv: string;
  tag: string;
};

export function encryptCredential(plain: Record<string, unknown> | string): EncryptedCredential {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const payload = typeof plain === "string" ? plain : JSON.stringify(plain);

  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

export function decryptCredential(
  input: EncryptedCredential,
): Record<string, unknown> | string {
  const decipher = createDecipheriv(
    ALGO,
    KEY,
    Buffer.from(input.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(input.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");

  try {
    return JSON.parse(decrypted) as Record<string, unknown>;
  } catch {
    return decrypted;
  }
}

