import { Entity } from '../../../../@core/domain/entity.base.ts';
import type { EntityConstructorParams } from '../../../../@core/domain/entity.base.ts';
import { Identifier } from '../../../../@core/domain/identifier.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { ValidationError } from '../../../../@core/domain/errors/domain-errors.ts';

export type ConsentType = 'TERMOS_DE_USO' | 'POLITICA_DE_PRIVACIDADE' | 'COMUNICACAO_MARKETING';
export type ConsentRecordProps = {
  participantId: string;
  eventId: string | null;
  registrationId: string | null;
  type: ConsentType;
  version: string;
  accepted: boolean;
  acceptedAt: Date;
};
export type CreateConsentRecordParams = ConsentRecordProps & { id?: string };
export type ConsentHistoryParams = { participantId: string };
export type ConsentRecordSnapshot = ConsentRecordProps & { id: string; createdAt: Date; updatedAt: Date };

export class ConsentRecord extends Entity<ConsentRecordProps> {
  private constructor(params: EntityConstructorParams<ConsentRecordProps>) {
    super(params);
  }

  public static create(params: CreateConsentRecordParams): Result<ConsentRecord, ValidationError> {
    if (!params.participantId.trim() || !params.version.trim() || !Number.isFinite(params.acceptedAt.getTime())) {
      return Result.fail(new ValidationError({ code: 'CONSENT_RECORD_INVALID', message: 'O consentimento deve identificar participante e versão apresentada.' }));
    }
    const entityParams: EntityConstructorParams<ConsentRecordProps> = {
      props: {
        participantId: params.participantId,
        eventId: params.eventId,
        registrationId: params.registrationId,
        type: params.type,
        version: params.version,
        accepted: params.accepted,
        acceptedAt: new Date(params.acceptedAt.getTime()),
      },
      createdAt: params.acceptedAt,
      updatedAt: params.acceptedAt,
    };
    if (params.id) entityParams.id = Identifier.fromExisting(params.id);
    return Result.ok(new ConsentRecord(entityParams));
  }

  public get participantId(): string { return this.props.participantId; }
  public get eventId(): string | null { return this.props.eventId; }
  public get registrationId(): string | null { return this.props.registrationId; }
  public get type(): ConsentType { return this.props.type; }
  public get version(): string { return this.props.version; }
  public get accepted(): boolean { return this.props.accepted; }
  public get acceptedAt(): Date { return new Date(this.props.acceptedAt.getTime()); }

  public snapshot(): ConsentRecordSnapshot {
    return {
      ...this.props,
      acceptedAt: this.acceptedAt,
      id: this.id.toString(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
