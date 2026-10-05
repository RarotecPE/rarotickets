import { Entity } from '@core/domain/entity.base';
import type { EntityConstructorParams } from '@core/domain/entity.base';
import { Result } from '@core/domain/result';
import { ConsentType } from '../value-objects/consent-type.vo';

export type ParticipantConsentProps = {
  participantId: string;
  type: ConsentType;
  version: string;
  accepted: boolean;
  acceptedAt: Date | null;
  ip: string | null;
};
export type ParticipantConsentConstructorParams = EntityConstructorParams<ParticipantConsentProps>;
export type CreateConsentParams = {
  participantId: string;
  type: string;
  version: string;
  accepted: boolean;
  acceptedAt?: Date | null;
  ip?: string | null;
};

/**
 * Consentimento armazenado de forma separada e identificável (§37),
 * com tipo, versão apresentada, aceite e data/hora.
 */
export class ParticipantConsent extends Entity<ParticipantConsentProps> {
  private constructor(params: ParticipantConsentConstructorParams) {
    super(params);
  }

  get participantId(): string { return this.props.participantId; }
  get type(): ConsentType { return this.props.type; }
  get version(): string { return this.props.version; }
  get accepted(): boolean { return this.props.accepted; }
  get acceptedAt(): Date | null { return this.props.acceptedAt; }
  get ip(): string | null { return this.props.ip; }

  public static create(params: CreateConsentParams): Result<ParticipantConsent> {
    const typeResult = ConsentType.create(params.type);
    if (typeResult.isFailure) return Result.fail(typeResult.error);

    const version = (params.version ?? '').trim();
    if (!version) return Result.fail(new Error('Versão do consentimento é obrigatória'));
    if (version.length > 30) return Result.fail(new Error('Versão do consentimento inválida'));

    if (params.accepted && !params.acceptedAt) {
      return Result.fail(new Error('Consentimento aceito deve registrar data e hora do aceite'));
    }

    return Result.ok(new ParticipantConsent({
      props: {
        participantId: params.participantId,
        type: typeResult.value,
        version,
        accepted: params.accepted,
        acceptedAt: params.accepted ? (params.acceptedAt ?? new Date()) : null,
        ip: params.ip ?? null,
      },
    }));
  }

  public static reconstitute(
    params: ParticipantConsentConstructorParams & { id: NonNullable<ParticipantConsentConstructorParams['id']> },
  ): ParticipantConsent {
    return new ParticipantConsent(params);
  }
}
