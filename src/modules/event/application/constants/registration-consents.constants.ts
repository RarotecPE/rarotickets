/** Consentimentos apresentados no formulário de inscrição (§37). */
export const REGISTRATION_CONSENTS = [
  { type: 'TERMOS_DE_USO', version: '2026-01', required: true, label: 'Declaro que li e aceito os termos de uso' },
  {
    type: 'POLITICA_DE_PRIVACIDADE',
    version: '2026-01',
    required: true,
    label: 'Declaro que li e aceito a política de privacidade',
  },
  {
    type: 'COMUNICACAO_MARKETING',
    version: '2026-01',
    required: false,
    label: 'Aceito receber comunicações de marketing (opcional)',
  },
] as const;
