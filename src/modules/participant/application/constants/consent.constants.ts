export const TERMS_OF_USE_VERSION = '2026-01';
export const PRIVACY_POLICY_VERSION = '2026-01';

/** Ordem em que os consentimentos são apresentados no formulário de inscrição. */
export const REGISTRATION_CONSENTS = [
  { type: 'TERMOS_DE_USO', version: TERMS_OF_USE_VERSION, required: true },
  { type: 'POLITICA_DE_PRIVACIDADE', version: PRIVACY_POLICY_VERSION, required: true },
  { type: 'COMUNICACAO_MARKETING', version: TERMS_OF_USE_VERSION, required: false },
] as const;
