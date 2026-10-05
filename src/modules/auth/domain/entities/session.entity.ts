import { Entity } from '@core/domain/entity.base';
import type { EntityConstructorParams } from '@core/domain/entity.base';

export type SessionProps = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  userAgent: string | null;
  ip: string | null;
};
export type SessionConstructorParams = EntityConstructorParams<SessionProps>;
export type CreateSessionParams = {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ip?: string | null;
};

export class Session extends Entity<SessionProps> {
  private constructor(params: SessionConstructorParams) {
    super(params);
  }

  get userId(): string { return this.props.userId; }
  get tokenHash(): string { return this.props.tokenHash; }
  get expiresAt(): Date { return this.props.expiresAt; }
  get revokedAt(): Date | null { return this.props.revokedAt; }

  public static create(params: CreateSessionParams): Session {
    return new Session({
      props: {
        userId: params.userId,
        tokenHash: params.tokenHash,
        expiresAt: params.expiresAt,
        revokedAt: null,
        userAgent: params.userAgent ?? null,
        ip: params.ip ?? null,
      },
    });
  }

  public static reconstitute(params: SessionConstructorParams & { id: NonNullable<SessionConstructorParams['id']> }): Session {
    return new Session(params);
  }

  public isExpired(reference: Date): boolean {
    return this.props.expiresAt.getTime() <= reference.getTime();
  }

  public isActive(reference: Date): boolean {
    return this.props.revokedAt === null && !this.isExpired(reference);
  }

  public revoke(at: Date): void {
    this.props.revokedAt = at;
    this.touch();
  }
}
