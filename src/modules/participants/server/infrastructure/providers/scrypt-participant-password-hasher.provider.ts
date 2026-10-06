import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { ParticipantPasswordHasher } from './participant-password-hasher.base';
import type {
  HashParticipantPasswordParams,
  VerifyParticipantPasswordParams,
} from '../../../domain/services/participant-password-hasher.interface';

type DeriveScryptKeyParams = {
  password: string;
  salt: Buffer;
  keyLength: number;
  cost: number;
  blockSize: number;
  parallelization: number;
};
type ParsedPasswordHash = { cost: number; blockSize: number; parallelization: number; salt: Buffer; key: Buffer };

const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_SALT_LENGTH = 16;
const SCRYPT_MAX_MEMORY_BYTES = 64 * 1024 * 1024;
const DUMMY_PASSWORD_HASH: ParsedPasswordHash = {
  cost: SCRYPT_COST,
  blockSize: SCRYPT_BLOCK_SIZE,
  parallelization: SCRYPT_PARALLELIZATION,
  salt: Buffer.alloc(SCRYPT_SALT_LENGTH),
  key: Buffer.alloc(SCRYPT_KEY_LENGTH),
};

export class ScryptParticipantPasswordHasher extends ParticipantPasswordHasher {
  async hash(params: HashParticipantPasswordParams): Promise<string> {
    const salt = randomBytes(SCRYPT_SALT_LENGTH);
    const key = await deriveScryptKey({
      password: params.password,
      salt,
      keyLength: SCRYPT_KEY_LENGTH,
      cost: SCRYPT_COST,
      blockSize: SCRYPT_BLOCK_SIZE,
      parallelization: SCRYPT_PARALLELIZATION,
    });
    return `scrypt$${SCRYPT_COST}$${SCRYPT_BLOCK_SIZE}$${SCRYPT_PARALLELIZATION}$${salt.toString('base64url')}$${key.toString('base64url')}`;
  }

  async verify(params: VerifyParticipantPasswordParams): Promise<boolean> {
    const parsedHash = parsePasswordHash(params.passwordHash);
    const comparisonHash = parsedHash ?? DUMMY_PASSWORD_HASH;
    const derivedKey = await deriveScryptKey({
      password: params.password,
      salt: comparisonHash.salt,
      keyLength: comparisonHash.key.length,
      cost: comparisonHash.cost,
      blockSize: comparisonHash.blockSize,
      parallelization: comparisonHash.parallelization,
    });
    return parsedHash !== null && timingSafeEqual(derivedKey, comparisonHash.key);
  }
}

function deriveScryptKey(params: DeriveScryptKeyParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(params.password, params.salt, params.keyLength, {
      N: params.cost,
      r: params.blockSize,
      p: params.parallelization,
      maxmem: SCRYPT_MAX_MEMORY_BYTES,
    }, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}

function parsePasswordHash(value: string): ParsedPasswordHash | null {
  const parts = value.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null;
  const cost = Number(parts[1]);
  const blockSize = Number(parts[2]);
  const parallelization = Number(parts[3]);
  const salt = Buffer.from(parts[4], 'base64url');
  const key = Buffer.from(parts[5], 'base64url');
  if (
    cost !== SCRYPT_COST
    || blockSize !== SCRYPT_BLOCK_SIZE
    || parallelization !== SCRYPT_PARALLELIZATION
    || salt.length !== SCRYPT_SALT_LENGTH
    || key.length !== SCRYPT_KEY_LENGTH
  ) return null;
  return { cost, blockSize, parallelization, salt, key };
}
