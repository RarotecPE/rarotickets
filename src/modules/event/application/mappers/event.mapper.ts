import { Mapper } from '@core/application/mapper.base';
import type { Event } from '../../domain/entities/event.entity';
import type { EventActivity } from '../../domain/entities/event-activity.entity';
import type { EventFormField } from '../../domain/entities/event-form-field.entity';
import type { EventLote } from '../../domain/entities/event-lote.entity';
import type { EventSpeaker } from '../../domain/entities/event-speaker.entity';
import type { EventSeatUsageSnapshot } from '../../domain/repositories/event-repository.interface';
import type { EventStatusValue } from '../../domain/value-objects/event-status.vo';

export type EventLoteDto = {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  maxQuantity: number;
  soldQuantity: number;
  availableQuantity: number;
  priceCents: number;
  priceFormatted: string;
  isActive: boolean;
  orderIndex: number;
};

export type EventFormFieldDto = {
  id: string;
  fieldKey: string;
  label: string;
  description: string | null;
  fieldType: string;
  fieldTypeLabel: string;
  isRequired: boolean;
  orderIndex: number;
  options: string[];
  placeholder: string | null;
  isActive: boolean;
};

export type EventSpeakerDto = {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  institution: string | null;
  orderIndex: number;
};

export type EventActivityDto = {
  id: string;
  title: string;
  description: string | null;
  speakerId: string | null;
  speakerName: string | null;
  startAt: Date;
  endAt: Date;
  room: string | null;
  orderIndex: number;
};

export type EventSeatUsageDto = {
  capacity: number;
  occupiedSeats: number;
  reservedSeats: number;
  waitlistCount: number;
  availableSeats: number;
};

export type EventSummaryDto = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  startAt: Date;
  endAt: Date;
  isOnline: boolean;
  onlineUrl: string | null;
  venueName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  locationLabel: string;
  capacity: number;
  registrationStart: Date;
  registrationEnd: Date;
  type: 'GRATUITO' | 'PAGO';
  status: EventStatusValue;
  statusLabel: string;
  workloadHours: number;
  certificateEnabled: boolean;
  waitlistEnabled: boolean;
  seatReservationMinutes: number;
  maxInstallments: number;
  allowPix: boolean;
  allowBoleto: boolean;
  allowCreditCard: boolean;
  minInstallmentCents: number;
  responsibleName: string;
  responsibleEmail: string | null;
  formVersion: number;
  publishedAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  createdBy: string | null;
  description?: string;
  usesWaitlist?: boolean;
};

export type MapEventParams = { event: Event; includeDescription?: boolean };

export class EventMapper extends Mapper<MapEventParams, EventSummaryDto> {
  public map({ event, includeDescription }: MapEventParams): EventSummaryDto {
    return {
      id: event.id.toString(),
      slug: event.slug.value,
      title: event.title.value,
      summary: event.summary.value,
      imageUrl: event.imageUrl.value,
      startDate: event.period.startDate,
      endDate: event.period.endDate,
      startTime: event.period.startTime,
      endTime: event.period.endTime,
      startAt: event.period.startAt,
      endAt: event.period.endAt,
      isOnline: event.location.isOnline,
      onlineUrl: event.location.onlineUrl,
      venueName: event.location.venueName,
      address: event.location.address,
      city: event.location.city,
      state: event.location.state,
      locationLabel: event.location.displayName,
      capacity: event.capacity.value,
      registrationStart: event.registrationWindow.start,
      registrationEnd: event.registrationWindow.end,
      type: event.type.value,
      status: event.status.value,
      statusLabel: event.status.label,
      workloadHours: event.workload.value,
      certificateEnabled: event.certificateSettings.enabled,
      waitlistEnabled: event.waitlistSettings.enabled,
      seatReservationMinutes: event.paymentSettings.seatReservationMinutes,
      maxInstallments: event.paymentSettings.maxInstallments,
      allowPix: event.paymentSettings.allowPix,
      allowBoleto: event.paymentSettings.allowBoleto,
      allowCreditCard: event.paymentSettings.allowCreditCard,
      minInstallmentCents: event.paymentSettings.minInstallmentCents,
      responsibleName: event.responsible.name,
      responsibleEmail: event.responsible.email,
      formVersion: event.formVersion,
      publishedAt: event.publishedAt,
      cancelledAt: event.cancelledAt,
      cancelReason: event.cancelReason,
      createdBy: event.createdBy,
      ...(includeDescription ? { description: event.description.value } : {}),
    };
  }

  public mapLote({ lote }: { lote: EventLote }): EventLoteDto {
    return {
      id: lote.id.toString(),
      eventId: lote.eventId,
      name: lote.name,
      description: lote.description,
      startDate: lote.startDate,
      endDate: lote.endDate,
      maxQuantity: lote.maxQuantity,
      soldQuantity: lote.soldQuantity,
      availableQuantity: lote.availableQuantity(),
      priceCents: lote.price.cents,
      priceFormatted: lote.price.format(),
      isActive: lote.isActive,
      orderIndex: lote.orderIndex,
    };
  }

  public mapFormField({ field }: { field: EventFormField }): EventFormFieldDto {
    return {
      id: field.id.toString(),
      fieldKey: field.fieldKey,
      label: field.label,
      description: field.description,
      fieldType: field.fieldType.value,
      fieldTypeLabel: field.fieldType.label,
      isRequired: field.isRequired,
      orderIndex: field.orderIndex,
      options: field.options,
      placeholder: field.placeholder,
      isActive: field.isActive,
    };
  }

  public mapSpeaker({ speaker }: { speaker: EventSpeaker }): EventSpeakerDto {
    return {
      id: speaker.id.toString(),
      name: speaker.name,
      bio: speaker.bio,
      photoUrl: speaker.photoUrl,
      institution: speaker.institution,
      orderIndex: speaker.orderIndex,
    };
  }

  public mapActivity({ activity, speakerName }: { activity: EventActivity; speakerName?: string | null }): EventActivityDto {
    return {
      id: activity.id.toString(),
      title: activity.title,
      description: activity.description,
      speakerId: activity.speakerId,
      speakerName: speakerName ?? null,
      startAt: activity.startAt,
      endAt: activity.endAt,
      room: activity.room,
      orderIndex: activity.orderIndex,
    };
  }

  public mapSeatUsage({ usage }: { usage: EventSeatUsageSnapshot }): EventSeatUsageDto {
    return {
      capacity: usage.capacity,
      occupiedSeats: usage.occupiedSeats,
      reservedSeats: usage.reservedSeats,
      waitlistCount: usage.waitlistCount,
      availableSeats: usage.availableSeats,
    };
  }
}
