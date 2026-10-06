import { ValueObject } from '../../../../@core/domain/value-object.base';
import { Result } from '../../../../@core/domain/result';
import { InvalidGlobalIdentityError } from '../errors/invalid-global-identity.error';

export type GlobalIdentityProps = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type CreateGlobalIdentityParams = GlobalIdentityProps;

export class GlobalIdentity extends ValueObject<GlobalIdentityProps> {
  private constructor(props: GlobalIdentityProps) {
    super(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get email(): string {
    return this.props.email;
  }

  get avatarUrl(): string | null {
    return this.props.avatarUrl;
  }

  static create(params: CreateGlobalIdentityParams): Result<GlobalIdentity, InvalidGlobalIdentityError> {
    const hasRequiredFields = Boolean(params.id.trim() && params.name.trim() && params.email.trim());
    const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.email.trim());
    if (!hasRequiredFields || !hasValidEmail) {
      return Result.fail(new InvalidGlobalIdentityError());
    }
    return Result.ok(new GlobalIdentity({
      id: params.id.trim(),
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      avatarUrl: params.avatarUrl,
    }));
  }
}
