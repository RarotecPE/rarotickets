import { Entity } from '@core/domain/entity.base';
import type { EntityConstructorParams } from '@core/domain/entity.base';
import { Result } from '@core/domain/result';

export type CheckInProps = {
  registrationId: string;
  eventId: string;
  checkedInAt: Date;
  checkedInBy: string | null;
  operatorName: string | null;
  method: 'QR_CODE' | 'MANUAL';
  isOverride: boolean;
  overrideReason: string | null;
};
export type CheckInConstructorParams = EntityConstructorParams<CheckInProps>;
export type ReconstituteCheckInParams = CheckInConstructorParams & {
  id: NonNullable<CheckInConstructorParams['id']>;
};
export type CreateCheckInParams = {
  registrationId: string;
  eventId: string;
  at: Date;
  checkedInBy?: string | null;
  operatorName?: string | null;
  method: 'QR_CODE' | 'MANUAL';
  isOverride?: boolean;
  overrideReason?: string | null;
};

/** Registro de presença do participante no evento (§29). */
export class CheckIn extends Entity<CheckInProps> {
  private constructor(params: CheckInConstructorParams) {
    super(params);
  }

  get registrationId(): string { return this.props.registrationId; }
  get eventId(): string { return this.props.eventId; }
  get checkedInAt(): Date { return this.props.checkedInAt; }
  get checkedInBy(): string | null { return this.props.checkedInBy; }
  get operatorName(): string | null { return this.props.operatorName; }
  get method(): 'QR_CODE' | 'MANUAL' { return this.props.method; }
  get isOverride(): boolean { return this.props.isOverride; }
  get overrideReason(): string | null { return this.props.overrideReason; }

  public static create(params: CreateCheckInParams): Result<CheckIn> {
    if (params.isOverride && (!params.overrideReason || params.overrideReason.trim().length < 5)) {
      return Result.fail(new Error('Check-in manual exige justificativa com ao menos 5 caracteres'));
    }
    return Result.ok(new CheckIn({
      props: {
        registrationId: params.registrationId,
        eventId: params.eventId,
        checkedInAt: params.at,
        checkedInBy: params.checkedInBy ?? null,
        operatorName: params.operatorName ?? null,
        method: params.method,
        isOverride: params.isOverride ?? false,
        overrideReason: params.overrideReason?.trim() ?? null,
      },
    }));
  }

  public static reconstitute(params: ReconstituteCheckInParams): CheckIn {
    return new CheckIn(params);
  }
}
