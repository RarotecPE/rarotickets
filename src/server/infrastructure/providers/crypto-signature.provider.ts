import { createHmac, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import type {
  GenerateTokenParams,
  SignPayloadParams,
  VerifySignatureParams,
} from '@core/contracts/signature-provider.contract';
import { SignatureProvider } from './signature-provider.base';

export class CryptoSignatureProvider extends SignatureProvider {
  public async sign(params: SignPayloadParams): Promise<string> {
    return createHmac('sha256', params.secret).update(params.payload).digest('base64url');
  }

  public async verify(params: VerifySignatureParams): Promise<boolean> {
    const expected = await this.sign({ payload: params.payload, secret: params.secret });
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(params.signature ?? '');
    if (expectedBuffer.length !== receivedBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  public async generateToken(params?: GenerateTokenParams): Promise<string> {
    return randomBytes(params?.bytes ?? 24).toString('base64url');
  }

  public async hash(params: SignPayloadParams): Promise<string> {
    return createHash('sha256').update(`${params.secret}:${params.payload}`).digest('hex');
  }
}
