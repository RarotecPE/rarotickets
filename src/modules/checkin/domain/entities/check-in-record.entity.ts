import { Entity } from '@core/domain/entity.base';
import type { EntityConstructorParams } from '@core/domain/entity.base';
import { Identifier } from '@core/domain/identifier';

export type CheckInMethodValue = 'QR_CODE' | 'MANUAL';

export type CheckInRecordProps = {
  registrationId: string;
  registrationCode: string;
  eventId: string;
  participantId: string;
  participantName: string;
  participantEmail: string | null;
  checkedInAt: Date;
  operatorUserId: string | null;
  operatorName: string | null;
  method: CheckInMethodValue;
  isOverride: boolean;
  overrideReason: string | null;
};

export type CheckInRecordConstructorParams = EntityConstructorParams<CheckInRecordProps>;
export type ReconstituteCheckInRecordParams = CheckInRecordConstructorParams & {
  id: NonNullable<CheckInRecordConstructorParams['id']>;
};

/**
 * Registro de presença (§29). É um modelo de leitura do credenciamento:
 * cada linha guarda operador, data/hora e como a entrada foi validada, sem
 * permitir duplicidade por inscrição.
 */
export class CheckInRecord extends Entity<CheckInRecordProps> {
  private constructor(params: CheckInRecordConstructorParams) {
    super(params);
  }

  public static reconstitute(params: ReconstituteCheckInRecordParams): CheckInRecord {
    return new CheckInRecord(params);
  }

  public static register(params: {
    registrationId: string;
    registrationCode: string;
    eventId: string;
    participantId: string;
    participantName: string;
    participantEmail: string | null;
    checkedInAt: Date;
    operatorUserId: string | null;
    operatorName: string | null;
    method: CheckInMethodValue;
    isOverride?: boolean;
    overrideReason?: string | null;
  }): CheckInRecord {
    return new CheckInRecord({
      props: {
        registrationId: params.registrationId,
        registrationCode: params.registrationCode,
        eventId: params.eventId,
        participantId: params.participantId,
        participantName: params.participantName,
        participantEmail: params.participantEmail,
        checkedInAt: params.checkedInAt,
        operatorUserId: params.operatorUserId,
        operatorName: params.operatorName,
        method: params.method,
        isOverride: params.isOverride ?? false,
        overrideReason: params.overrideReason ?? null,
      },
      id: Identifier.create(),
      createdAt: params.checkedInAt,
      updatedAt: params.checkedInAt,
    });
  }

  public get registrationId(): string { return this.props.registrationId; }
  public get registrationCode(): string { return this.props.registrationCode; }
  public get eventId(): string { return this.props.eventId; }
  public get participantId(): string { return this.props.participantId; }
  public get participantName(): string { return this.props.participantName; }
  public get participantEmail(): string | null { return this.props.participantEmail; }
  public get checkedInAt(): Date { return this.props.checkedInAt; }
  public get operatorUserId(): string | null { return this.props.operatorUserId; }
  public get operatorName(): string | null { return this.props.operatorName; }
  public get method(): CheckInMethodValue { return this.props.method; }
  public get isOverride(): boolean { return this.props.isOverride; }
  public get overrideReason(): string | null { return this.props.overrideReason; }

  public isFromCredential(): boolean {
    return this.props.method === 'QR_CODE';
  }

  public describeMethod(): string {
    return this.isFromCredential() ? 'Credencial (QR Code)' : 'Registro manual';
  }

  /** Duplicidade é sempre recusada pelo fluxo de check-in (§29). */
  public isDuplicateOf(other: CheckInRecord): boolean {
    return this.props.registrationId === other.props.registrationId;
  }
}
