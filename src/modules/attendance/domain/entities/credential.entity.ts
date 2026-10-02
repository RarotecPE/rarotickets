import { Entity } from '../../../../@core/domain/entity.base.ts';
import type { EntityConstructorParams } from '../../../../@core/domain/entity.base.ts';
import { Identifier } from '../../../../@core/domain/identifier.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { InvalidStateError, ValidationError } from '../../../../@core/domain/errors/domain-errors.ts';

export type CredentialProps = {
  eventId: string;
  registrationId: string;
  participantId: string;
  tokenHash: string;
  issuedAt: Date;
  validUntil: Date | null;
  revokedAt: Date | null;
  revocationReason: string | null;
};
export type CreateCredentialParams = CredentialProps & { id?: string };
export type CredentialValidationParams = { eventId: string; now: Date };
export type RevokeCredentialParams = { reason: string; now: Date };
export type CredentialSnapshot = CredentialProps & { id: string; createdAt: Date; updatedAt: Date };

export class Credential extends Entity<CredentialProps> {
  private constructor(params: EntityConstructorParams<CredentialProps>) {
    super(params);
  }

  public static create(params: CreateCredentialParams): Result<Credential, ValidationError> {
    if (!params.eventId.trim() || !params.registrationId.trim() || !params.participantId.trim() || !params.tokenHash.trim()) {
      return Result.fail(new ValidationError({ code: 'CREDENTIAL_REQUIRED_FIELDS', message: 'A credencial deve estar vinculada a evento e inscrição e possuir um hash.' }));
    }
    if (params.validUntil && params.validUntil.getTime() <= params.issuedAt.getTime()) {
      return Result.fail(new ValidationError({ code: 'CREDENTIAL_VALIDITY_INVALID', message: 'A validade da credencial deve ser posterior à emissão.' }));
    }
    const props: CredentialProps = {
      eventId: params.eventId,
      registrationId: params.registrationId,
      participantId: params.participantId,
      tokenHash: params.tokenHash,
      issuedAt: new Date(params.issuedAt.getTime()),
      validUntil: params.validUntil ? new Date(params.validUntil.getTime()) : null,
      revokedAt: params.revokedAt ? new Date(params.revokedAt.getTime()) : null,
      revocationReason: params.revocationReason,
    };
    const entityParams: EntityConstructorParams<CredentialProps> = {
      props,
      createdAt: params.issuedAt,
      updatedAt: params.issuedAt,
    };
    if (params.id) entityParams.id = Identifier.fromExisting(params.id);
    return Result.ok(new Credential(entityParams));
  }

  public get eventId(): string { return this.props.eventId; }
  public get registrationId(): string { return this.props.registrationId; }
  public get participantId(): string { return this.props.participantId; }
  public get tokenHash(): string { return this.props.tokenHash; }
  public get issuedAt(): Date { return new Date(this.props.issuedAt.getTime()); }
  public get validUntil(): Date | null { return this.props.validUntil ? new Date(this.props.validUntil.getTime()) : null; }
  public get revokedAt(): Date | null { return this.props.revokedAt ? new Date(this.props.revokedAt.getTime()) : null; }
  public get revocationReason(): string | null { return this.props.revocationReason; }

  public isValid(params: CredentialValidationParams): boolean {
    return this.props.eventId === params.eventId
      && !this.props.revokedAt
      && (!this.props.validUntil || this.props.validUntil.getTime() >= params.now.getTime());
  }

  public revoke(params: RevokeCredentialParams): Result<boolean, ValidationError | InvalidStateError> {
    if (!params.reason.trim()) {
      return Result.fail(new ValidationError({ code: 'CREDENTIAL_REVOCATION_REASON_REQUIRED', message: 'Informe o motivo da revogação da credencial.' }));
    }
    if (this.props.revokedAt) return Result.ok(false);
    this.props.revokedAt = new Date(params.now.getTime());
    this.props.revocationReason = params.reason.trim();
    this.touch({ at: params.now });
    return Result.ok(true);
  }

  public snapshot(): CredentialSnapshot {
    return {
      ...this.props,
      issuedAt: this.issuedAt,
      validUntil: this.validUntil,
      revokedAt: this.revokedAt,
      id: this.id.toString(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
