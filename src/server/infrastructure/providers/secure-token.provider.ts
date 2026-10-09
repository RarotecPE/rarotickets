import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readEnvironment } from "@/server/config/environment.config";

export type VerifySignatureParams = { value: string; signature: string; secret: string };
export type SignedToken = { token: string; tokenHash: string };

export function createSecureToken(): SignedToken {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createQrToken(registrationId: string): string {
  const environment = readEnvironment();
  if (!environment.qrSigningSecret || environment.qrSigningSecret.startsWith("[")) {
    throw new Error("QR_SIGNING_SECRET precisa ser configurado para emitir credenciais.");
  }
  const randomPart = randomBytes(18).toString("base64url");
  const body = `${registrationId}.${randomPart}`;
  const signature = createHmac("sha256", environment.qrSigningSecret).update(body).digest("base64url");
  return `RT1.${body}.${signature}`;
}

export function verifyQrToken(params: VerifySignatureParams): boolean {
  const expected = createHmac("sha256", params.secret).update(params.value).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(params.signature, "base64url");
  } catch {
    return false;
  }
  return supplied.length === expected.length && timingSafeEqual(expected, supplied);
}

export function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
