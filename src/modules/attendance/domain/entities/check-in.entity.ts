import { Entity } from '../../../../@core/domain/entity.base.ts';
import type { EntityConstructorParams } from '../../../../@core/domain/entity.base.ts';
import { Identifier } from '../../../../@core/domain/identifier.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { ValidationError } from '../../../../@core/domain/errors/domain-errors.ts';

export type CheckInObservation = { actorId: string; reason: string; observedAt: Date };
export type PresenceCorrection = {
  actorId: string;
  reason: string;
  previousPresence: boolean;
  newPresence: boolean;
  correctedAt: Date;
};
export type CheckInProps = {
  eventId: string;
  registrationId: string;
  participantId: string;
  credentialId: string;
  checkedInAt: Date;
  checkedInBy: string;
  isPresent: boolean;
  administrativeRechecks: CheckInObservation[];
  presenceCorrections: PresenceCorrection[];
};
export type CreateCheckInParams = CheckInProps & { id?: string };
export type RecordAdministrativeRecheckParams = { actorId: string; reason: string; now: Date };
export type CorrectPresenceParams = { actorId: string; reason: string; isPresent: boolean; now: Date };
export type CheckInSnapshot = CheckInProps & { id: string; createdAt: Date; updatedAt: Date };

export class CheckIn extends Entity<CheckInProps> {
  private constructor(params: EntityConstructorParams<CheckInProps>) {
    super(params);
  }

  public static create(params: CreateCheckInParams): Result<CheckIn, ValidationError> {
    if (!params.eventId.trim() || !params.registrationId.trim() || !params.participantId.trim()
      || !params.credentialId.trim() || !params.checkedInBy.trim()) {
      return Result.fail(new ValidationError({ code: 'CHECKIN_REQUIRED_FIELDS', message: 'O check-in deve identificar evento, participante, inscrição, credencial e responsável.' }));
    }
    const props: CheckInProps = {
      eventId: params.eventId,
      registrationId: params.registrationId,
      participantId: params.participantId,
      credentialId: params.credentialId,
      checkedInAt: new Date(params.checkedInAt.getTime()),
      checkedInBy: params.checkedInBy,
      isPresent: params.isPresent,
      administrativeRechecks: this.copyObservations(params.administrativeRechecks),
      presenceCorrections: this.copyCorrections(params.presenceCorrections),
    };
    const entityParams: EntityConstructorParams<CheckInProps> = {
      props,
      createdAt: params.checkedInAt,
      updatedAt: params.checkedInAt,
    };
    if (params.id) entityParams.id = Identifier.fromExisting(params.id);
    return Result.ok(new CheckIn(entityParams));
  }

  public get eventId(): string { return this.props.eventId; }
  public get registrationId(): string { return this.props.registrationId; }
  public get participantId(): string { return this.props.participantId; }
  public get credentialId(): string { return this.props.credentialId; }
  public get checkedInAt(): Date { return new Date(this.props.checkedInAt.getTime()); }
  public get checkedInBy(): string { return this.props.checkedInBy; }
  public get isPresent(): boolean { return this.props.isPresent; }
  public get administrativeRechecks(): CheckInObservation[] { return CheckIn.copyObservations(this.props.administrativeRechecks); }
  public get presenceCorrections(): PresenceCorrection[] { return CheckIn.copyCorrections(this.props.presenceCorrections); }

  public recordAdministrativeRecheck(params: RecordAdministrativeRecheckParams): Result<void, ValidationError> {
    if (!params.actorId.trim() || !params.reason.trim()) {
      return Result.fail(new ValidationError({ code: 'CHECKIN_OVERRIDE_AUDIT_REQUIRED', message: 'Repetir o check-in exige responsável e motivo.' }));
    }
    this.props.administrativeRechecks.push({
      actorId: params.actorId,
      reason: params.reason.trim(),
      observedAt: new Date(params.now.getTime()),
    });
    this.touch({ at: params.now });
    return Result.ok();
  }

  public correctPresence(params: CorrectPresenceParams): Result<void, ValidationError> {
    if (!params.actorId.trim() || !params.reason.trim()) {
      return Result.fail(new ValidationError({ code: 'PRESENCE_CORRECTION_AUDIT_REQUIRED', message: 'Alterar a presença exige responsável e motivo.' }));
    }
    if (this.props.isPresent !== params.isPresent) {
      this.props.presenceCorrections.push({
        actorId: params.actorId,
        reason: params.reason.trim(),
        previousPresence: this.props.isPresent,
        newPresence: params.isPresent,
        correctedAt: new Date(params.now.getTime()),
      });
      this.props.isPresent = params.isPresent;
      this.touch({ at: params.now });
    }
    return Result.ok();
  }

  public snapshot(): CheckInSnapshot {
    return {
      ...this.props,
      checkedInAt: this.checkedInAt,
      administrativeRechecks: this.administrativeRechecks,
      presenceCorrections: this.presenceCorrections,
      id: this.id.toString(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private static copyObservations(values: CheckInObservation[]): CheckInObservation[] {
    return values.map((value) => ({ ...value, observedAt: new Date(value.observedAt.getTime()) }));
  }

  private static copyCorrections(values: PresenceCorrection[]): PresenceCorrection[] {
    return values.map((value) => ({ ...value, correctedAt: new Date(value.correctedAt.getTime()) }));
  }
}
