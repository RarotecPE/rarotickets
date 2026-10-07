import "server-only";
import { createHmac, createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { readEnvironment } from "@/server/config/environment.config";
import type { AccessTokenParams, ICredentialProvider, IssuedCapabilityToken, RegistrationCodeParams, VerifyCredentialParams } from "@/modules/ticketing/domain/services/credential-provider.interface";

export class SecureCredentialProvider implements ICredentialProvider {
  issueAccessToken(params: AccessTokenParams): IssuedCapabilityToken {
    const secret = readEnvironment().appSecretKey;
    if (!secret || secret.startsWith("[")) throw new Error("APP_SECRET_KEY precisa ser configurado para criar links privados.");
    const body = `PT1.${params.registrationId}`;
    const signature = createHmac("sha256", secret).update(body).digest("base64url");
    const rawToken = `${body}.${signature}`;
    return { rawToken, hash: this.hashToken({ token: rawToken }) };
  }

  issueRegistrationCode(params: RegistrationCodeParams): string {
    return `INS-${params.year}-${randomBytes(4).toString("hex").toUpperCase()}`;
  }

  issueCertificateCode(params: RegistrationCodeParams): string {
    return `CERT-${params.year}-${randomBytes(5).toString("hex").toUpperCase()}`;
  }

  createQrToken(params: AccessTokenParams): string {
    const secret = readEnvironment().qrSigningSecret;
    if (!secret || secret.startsWith("[")) throw new Error("QR_SIGNING_SECRET precisa ser configurado para emitir credenciais.");
    const body = `${params.registrationId}.${randomUUID()}`;
    const signature = createHmac("sha256", secret).update(body).digest("base64url");
    return `RT1.${body}.${signature}`;
  }

  verifyQrToken(params: VerifyCredentialParams): string | null {
    const secret = readEnvironment().qrSigningSecret;
    if (!secret || secret.startsWith("[")) return null;
    const parts = params.token.split(".");
    if (parts.length !== 4 || parts[0] !== "RT1") return null;
    const body = `${parts[1]}.${parts[2]}`;
    const expected = createHmac("sha256", secret).update(body).digest();
    const supplied = Buffer.from(parts[3], "base64url");
    if (supplied.length !== expected.length || !timingSafeEqual(expected, supplied)) return null;
    return parts[1];
  }

  hashToken(params: { token: string }): string {
    return createHash("sha256").update(params.token).digest("hex");
  }
}
