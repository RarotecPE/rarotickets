export type RaroNexusIntegrationErrorCode = 'NOT_CONFIGURED' | 'UNAVAILABLE' | 'INVALID_RESPONSE';

export type RaroNexusIntegrationErrorParams = {
  code: RaroNexusIntegrationErrorCode;
};

export class RaroNexusIntegrationError extends Error {
  readonly code: RaroNexusIntegrationErrorCode;

  constructor(params: RaroNexusIntegrationErrorParams) {
    super('Não foi possível validar a autenticação no RaroNexus.');
    this.name = 'RaroNexusIntegrationError';
    this.code = params.code;
  }
}
