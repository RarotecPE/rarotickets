import type {
  GenerateTokenParams,
  ISignatureProvider,
  SignPayloadParams,
  VerifySignatureParams,
} from '@core/contracts/signature-provider.contract';

export abstract class SignatureProvider implements ISignatureProvider {
  abstract sign(params: SignPayloadParams): Promise<string>;
  abstract verify(params: VerifySignatureParams): Promise<boolean>;
  abstract generateToken(params?: GenerateTokenParams): Promise<string>;
  abstract hash(params: SignPayloadParams): Promise<string>;
}
