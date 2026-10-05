export type SignPayloadParams = { payload: string; secret: string };
export type VerifySignatureParams = { payload: string; signature: string; secret: string };
export type GenerateTokenParams = { bytes?: number };

/** Abstrai criptografia (HMAC/sha256/token aleatório) — implementada no server. */
export interface ISignatureProvider {
  sign(params: SignPayloadParams): Promise<string>;
  verify(params: VerifySignatureParams): Promise<boolean>;
  generateToken(params?: GenerateTokenParams): Promise<string>;
  hash(params: SignPayloadParams): Promise<string>;
}

export const SIGNATURE_PROVIDER = Symbol('ISignatureProvider');
