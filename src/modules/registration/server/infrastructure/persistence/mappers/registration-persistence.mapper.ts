import { PersistenceMapper } from '@core/application/persistence-mapper.base';
import type { ToDomainParams, ToPersistenceParams } from '@core/application/persistence-mapper.base';
import { Identifier } from '@core/domain/identifier';
import { MoneyVO } from '@core/domain/value-objects/money.vo';
import { CheckIn } from '../../../../domain/entities/check-in.entity';
import { Registration } from '../../../../domain/entities/registration.entity';
import { FormAnswer } from '../../../../domain/value-objects/form-answer.vo';
import { RegistrationCode } from '../../../../domain/value-objects/registration-code.vo';
import { RegistrationStatus } from '../../../../domain/value-objects/registration-status.vo';
import type { RegistrationStatusValue } from '../../../../domain/value-objects/registration-status.vo';
import { Reservation } from '../../../../domain/value-objects/reservation.vo';
import { SeatStatus } from '../../../../domain/value-objects/seat-status.vo';
import type { SeatStatusValue } from '../../../../domain/value-objects/seat-status.vo';
import type {
  CheckInModel,
  RegistrationAnswerModel,
  RegistrationModel,
} from '../models/registration.model';

export type RegistrationRecord = RegistrationModel & { answers: RegistrationAnswerModel[]; check_in: CheckInModel | null };
export type RegistrationData = Omit<RegistrationModel, 'created_at' | 'updated_at'> & {
  created_at: Date;
  updated_at: Date;
};

export class RegistrationPersistenceMapper extends PersistenceMapper<
  Registration,
  RegistrationRecord,
  RegistrationData
> {
  public toDomain({ record }: ToDomainParams<RegistrationRecord>): Registration {
    return Registration.reconstitute({
      props: {
        code: RegistrationCode.reconstitute(record.code),
        eventId: record.event_id,
        participantId: record.participant_id,
        loteId: record.lote_id,
        loteName: record.lote_name,
        status: RegistrationStatus.reconstitute(record.status as RegistrationStatusValue),
        seatStatus: SeatStatus.reconstitute(record.seat_status as SeatStatusValue),
        price: MoneyVO.reconstitute({ cents: record.price_cents }),
        discount: MoneyVO.reconstitute({ cents: record.discount_cents }),
        finalAmount: MoneyVO.reconstitute({ cents: record.final_amount_cents }),
        couponId: record.coupon_id,
        couponCode: record.coupon_code,
        isCourtesy: record.is_courtesy,
        courtesyReason: record.courtesy_reason,
        paymentMethod: record.payment_method,
        waitlistPosition: record.waitlist_position,
        reservation: Reservation.reconstitute(
          record.reservation_expires_at ? new Date(record.reservation_expires_at) : null,
        ),
        formVersion: record.form_version,
        answers: (record.answers ?? []).map((answer) =>
          FormAnswer.reconstitute({
            fieldId: answer.field_id,
            fieldKey: answer.field_key,
            fieldLabel: answer.field_label,
            fieldType: answer.field_type,
            value: answer.value,
          }),
        ),
        checkIn: record.check_in ? this.mapCheckIn(record.check_in) : null,
        notes: record.notes,
        confirmedAt: record.confirmed_at ? new Date(record.confirmed_at) : null,
        cancelledAt: record.cancelled_at ? new Date(record.cancelled_at) : null,
        cancelledBy: record.cancelled_by,
        cancelReason: record.cancel_reason,
        createdBy: record.created_by,
      },
      id: Identifier.fromExisting(record.id),
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    });
  }

  public toPersistence({ entity }: ToPersistenceParams<Registration>): RegistrationData {
    return {
      id: entity.id.toString(),
      code: entity.code.value,
      event_id: entity.eventId,
      participant_id: entity.participantId,
      lote_id: entity.loteId,
      status: entity.status.value,
      seat_status: entity.seatStatus.value,
      price_cents: entity.price.cents,
      discount_cents: entity.discount.cents,
      final_amount_cents: entity.finalAmount.cents,
      lote_name: entity.loteName,
      coupon_id: entity.couponId,
      coupon_code: entity.couponCode,
      is_courtesy: entity.isCourtesy,
      courtesy_reason: entity.courtesyReason,
      payment_method: entity.paymentMethod,
      waitlist_position: entity.waitlistPosition,
      reservation_expires_at: entity.reservation.expiresAt,
      form_version: entity.formVersion,
      notes: entity.notes,
      confirmed_at: entity.confirmedAt,
      cancelled_at: entity.cancelledAt,
      cancelled_by: entity.cancelledBy,
      cancel_reason: entity.cancelReason,
      created_by: entity.createdBy,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }

  public mapCheckIn(record: CheckInModel): CheckIn {
    return CheckIn.reconstitute({
      props: {
        registrationId: record.registration_id,
        eventId: record.event_id,
        checkedInAt: new Date(record.checked_in_at),
        checkedInBy: record.checked_in_by,
        operatorName: record.operator_name,
        method: record.method as 'QR_CODE' | 'MANUAL',
        isOverride: record.is_override,
        overrideReason: record.override_reason,
      },
      id: Identifier.fromExisting(record.id),
      createdAt: new Date(record.created_at),
    });
  }
}
