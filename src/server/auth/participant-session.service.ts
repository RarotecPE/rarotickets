import "server-only";
import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  pbkdf2Sync,
  timingSafeEqual,
} from "node:crypto";
import { readEnvironment } from "@/server/config/environment.config";

export type ParticipantSessionPayload = {
  participantId: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string;
  issuedAt: number;
  expiresAt: number;
};

export const PARTICIPANT_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 dias

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, expectedDerived] = storedHash.split(":");
  if (!salt || !expectedDerived) return false;
  const actualDerived = pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
  const actualBuffer = Buffer.from(actualDerived);
  const expectedBuffer = Buffer.from(expectedDerived);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function generateRawToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateOtpCode(): string {
  return randomInt(100_000, 1_000_000).toString();
}

export function createParticipantSessionToken(params: {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string;
}): string {
  const environment = readEnvironment();
  const secret = environment.appSecretKey || "rarotickets-default-participant-secret-key-min-32-chars";
  const now = Date.now();
  const payload: ParticipantSessionPayload = {
    participantId: params.id,
    name: params.name,
    email: params.email,
    cpf: params.cpf,
    phone: params.phone,
    issuedAt: now,
    expiresAt: now + PARTICIPANT_SESSION_MAX_AGE_SECONDS * 1000,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyParticipantSessionToken(
  token: string | null | undefined,
): ParticipantSessionPayload | null {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const environment = readEnvironment();
  const secret = environment.appSecretKey || "rarotickets-default-participant-secret-key-min-32-chars";
  const expectedSignature = createHmac("sha256", secret).update(encodedPayload).digest("base64url");

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const json = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const payload = JSON.parse(json) as ParticipantSessionPayload;
    if (typeof payload !== "object" || !payload.participantId || !payload.expiresAt) {
      return null;
    }
    if (Date.now() > payload.expiresAt) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

