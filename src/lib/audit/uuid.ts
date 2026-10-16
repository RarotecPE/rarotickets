import { randomBytes } from 'crypto';

/**
 * Gera um UUID v7 canônico ordenável por tempo (RFC 9562).
 */
export function generateUuidV7(): string {
  const now = Date.now();
  const bytes = randomBytes(16);

  // 48 bits de timestamp Unix em milissegundos
  bytes[0] = (now / 0x10000000000) & 0xff;
  bytes[1] = (now / 0x100000000) & 0xff;
  bytes[2] = (now / 0x1000000) & 0xff;
  bytes[3] = (now / 0x10000) & 0xff;
  bytes[4] = (now / 0x100) & 0xff;
  bytes[5] = now & 0xff;

  // Versão 7 nos 4 bits superiores
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  // Variante RFC 4122 (10xx nos 2 bits superiores)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join('-');
}

