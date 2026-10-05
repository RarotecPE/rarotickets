import { config as loadDotenv } from 'dotenv';

loadDotenv({ quiet: true });

export type NodeEnvironment = 'development' | 'test' | 'production';

export type RawEnv = Record<string, string | undefined>;

const cache: { raw?: RawEnv } = {};

export function getRawEnv(): RawEnv {
  cache.raw ??= process.env as RawEnv;
  return cache.raw;
}

export function readString(key: string, fallback: string): string {
  const value = getRawEnv()[key];
  return value === undefined || value === '' ? fallback : value;
}

export function readOptionalString(key: string): string | undefined {
  const value = getRawEnv()[key];
  return value === undefined || value === '' ? undefined : value;
}

export function readNumber(key: string, fallback: number): number {
  const value = getRawEnv()[key];
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function readBoolean(key: string, fallback: boolean): boolean {
  const value = getRawEnv()[key];
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function readNodeEnv(): NodeEnvironment {
  const value = readString('NODE_ENV', 'development');
  if (value === 'production' || value === 'test') return value;
  return 'development';
}

/**
 * Em produção exigimos segredos reais: nenhum valor fictício pode passar
 * despercebido. Em desenvolvimento os valores de exemplo são aceitos.
 */
export function assertProductionSecrets(config: {
  nodeEnv: NodeEnvironment;
  sessionSecret: string;
  credentialSecret: string;
  certificateSecret: string;
  databaseUrl: string;
}): void {
  if (config.nodeEnv !== 'production') return;

  const placeholders = ['troque-este-segredo', 'outro-segredo', 'segredo-para-assinar', 'usuario:senha'];
  const values = [
    config.sessionSecret,
    config.credentialSecret,
    config.certificateSecret,
    config.databaseUrl,
  ];

  if (values.some((value) => placeholders.some((placeholder) => value.includes(placeholder)))) {
    throw new Error(
      'Configuração inválida: substitua os valores fictícios do .env antes de rodar em produção.',
    );
  }
  if (config.sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET deve ter pelo menos 32 caracteres em produção.');
  }
}
