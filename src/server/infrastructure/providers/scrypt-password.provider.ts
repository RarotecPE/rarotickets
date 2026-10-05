import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { ComparePasswordParams, HashPasswordParams } from '@modules/auth/domain/services/password-hasher.interface';
import { PasswordHasher } from './password-hasher.base';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;

/** Hash de senha com scrypt (node:crypto) — nunca armazenamos senha em texto. */
export class ScryptPasswordHasher extends PasswordHasher {
  public async hash(params: HashPasswordParams): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derived = await scrypt(params.plain, salt, KEY_LENGTH);
    return `scrypt$${salt}$${derived.toString('hex')}`;
  }

  public async compare(params: ComparePasswordParams): Promise<boolean> {
    const [algorithm, salt, hash] = (params.hashed ?? '').split('$');
    if (algorithm !== 'scrypt' || !salt || !hash) return false;

    const derived = await scrypt(params.plain, salt, KEY_LENGTH);
    const expected = Buffer.from(hash, 'hex');
    if (expected.length !== derived.length) return false;
    return timingSafeEqual(expected, derived);
  }
}
