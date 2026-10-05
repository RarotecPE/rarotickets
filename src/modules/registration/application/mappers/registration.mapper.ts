import { Mapper } from '@core/application/mapper.base';
import type { CheckIn } from '../../domain/entities/check-in.entity';
import type { Registration } from '../../domain/entities/registration.entity';
import { REGISTRATION_STATUS_LABELS } from '../../domain/value-objects/registration-status.vo';

export type FormAnswerDto = {
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  value: string | null;
  displayValue: string;
};

export type RegistrationDto = {
  id: string;
  code: string;
  eventId: string;
  participantId: string;
  loteId: string | null;
  loteName: string | null;
  status: string;
  statusLabel: string;
  seatStatus: string;
  priceCents: number;
  priceFormatted: string;
  discountCents: number;
  discountFormatted: string;
  finalAmountCents: number;
  finalAmountFormatted: string;
  couponCode: string | null;
  isCourtesy: boolean;
  courtesyReason: string | null;
  paymentMethod: string | null;
  waitlistPosition: number | null;
  reservationExpiresAt: Date | null;
  formVersion: number;
  answers: FormAnswerDto[];
  checkInAt: Date | null;
  hasCheckedIn: boolean;
  notes: string | null;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MapRegistrationParams = { registration: Registration };

export class RegistrationMapper extends Mapper<MapRegistrationParams, RegistrationDto> {
  public map({ registration }: MapRegistrationParams): RegistrationDto {
    return {
      id: registration.id.toString(),
      code: registration.code.value,
      eventId: registration.eventId,
      participantId: registration.participantId,
      loteId: registration.loteId,
      loteName: registration.loteName,
      status: registration.status.value,
      statusLabel: REGISTRATION_STATUS_LABELS[registration.status.value],
      seatStatus: registration.seatStatus.value,
      priceCents: registration.price.cents,
      priceFormatted: registration.price.format(),
      discountCents: registration.discount.cents,
      discountFormatted: registration.discount.format(),
      finalAmountCents: registration.finalAmount.cents,
      finalAmountFormatted: registration.finalAmount.format(),
      couponCode: registration.couponCode,
      isCourtesy: registration.isCourtesy,
      courtesyReason: registration.courtesyReason,
      paymentMethod: registration.paymentMethod,
      waitlistPosition: registration.waitlistPosition,
      reservationExpiresAt: registration.reservation.expiresAt,
      formVersion: registration.formVersion,
      answers: registration.answers.map((answer) => ({
        fieldKey: answer.fieldKey,
        fieldLabel: answer.fieldLabel,
        fieldType: answer.fieldType,
        value: answer.value,
        displayValue: answer.toDisplayValue(),
      })),
      checkInAt: registration.checkIn?.checkedInAt ?? null,
      hasCheckedIn: registration.hasCheckedIn(),
      notes: registration.notes,
      confirmedAt: registration.confirmedAt,
      cancelledAt: registration.cancelledAt,
      cancelReason: registration.cancelReason,
      createdAt: registration.createdAt,
      updatedAt: registration.updatedAt,
    };
  }

  public mapCheckIn({ checkIn }: { checkIn: CheckIn }): RegistrationDto['checkInAt'] extends never ? never : {
    id: string;
    registrationId: string;
    eventId: string;
    checkedInAt: Date;
    operatorName: string | null;
    method: string;
    isOverride: boolean;
    overrideReason: string | null;
  } {
    return {
      id: checkIn.id.toString(),
      registrationId: checkIn.registrationId,
      eventId: checkIn.eventId,
      checkedInAt: checkIn.checkedInAt,
      operatorName: checkIn.operatorName,
      method: checkIn.method,
      isOverride: checkIn.isOverride,
      overrideReason: checkIn.overrideReason,
    };
  }
}
