import type {
  ComparePasswordParams,
  HashPasswordParams,
  IPasswordHasher,
} from '@modules/auth/domain/services/password-hasher.interface';

export abstract class PasswordHasher implements IPasswordHasher {
  abstract hash(params: HashPasswordParams): Promise<string>;
  abstract compare(params: ComparePasswordParams): Promise<boolean>;
}
