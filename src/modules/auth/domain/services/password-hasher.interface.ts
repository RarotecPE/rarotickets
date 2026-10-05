export type HashPasswordParams = { plain: string };
export type ComparePasswordParams = { plain: string; hashed: string };

/** Porta de hash de senha — implementada na infraestrutura (scrypt/bcrypt/argon). */
export interface IPasswordHasher {
  hash(params: HashPasswordParams): Promise<string>;
  compare(params: ComparePasswordParams): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol('IPasswordHasher');
