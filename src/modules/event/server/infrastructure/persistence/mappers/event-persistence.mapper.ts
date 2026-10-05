import { PersistenceMapper } from '@core/application/persistence-mapper.base';
import type { ToDomainParams, ToPersistenceParams } from '@core/application/persistence-mapper.base';
import { Identifier } from '@core/domain/identifier';
import { MoneyVO } from '@core/domain/value-objects/money.vo';
import { Event } from '../../../../domain/entities/event.entity';
import { EventActivity } from '../../../../domain/entities/event-activity.entity';
import { EventFormField } from '../../../../domain/entities/event-form-field.entity';
import { EventLote } from '../../../../domain/entities/event-lote.entity';
import { EventSpeaker } from '../../../../domain/entities/event-speaker.entity';
import { CertificateSettings } from '../../../../domain/value-objects/certificate-settings.vo';
import { EventCapacity } from '../../../../domain/value-objects/event-capacity.vo';
import { EventDescription } from '../../../../domain/value-objects/event-description.vo';
import { EventLocation } from '../../../../domain/value-objects/event-location.vo';
import { EventPeriod } from '../../../../domain/value-objects/event-period.vo';
import { EventSlug } from '../../../../domain/value-objects/event-slug.vo';
import { EventStatus } from '../../../../domain/value-objects/event-status.vo';
import type { EventStatusValue } from '../../../../domain/value-objects/event-status.vo';
import { EventSummary } from '../../../../domain/value-objects/event-summary.vo';
import { EventTitle } from '../../../../domain/value-objects/event-title.vo';
import { EventType } from '../../../../domain/value-objects/event-type.vo';
import { FormFieldType } from '../../../../domain/value-objects/form-field-type.vo';
import type { FormFieldTypeValue } from '../../../../domain/value-objects/form-field-type.vo';
import { ImageUrl } from '../../../../domain/value-objects/image-url.vo';
import { PaymentSettings } from '../../../../domain/value-objects/payment-settings.vo';
import { RegistrationWindow } from '../../../../domain/value-objects/registration-window.vo';
import { Responsible } from '../../../../domain/value-objects/responsible.vo';
import { WaitlistSettings } from '../../../../domain/value-objects/waitlist-settings.vo';
import { WorkloadHours } from '../../../../domain/value-objects/workload-hours.vo';
import type {
  EventActivityModel,
  EventFormFieldModel,
  EventLoteModel,
  EventModel,
  EventModelData,
  EventSeatUsageModel,
  EventSpeakerModel,
} from '../models/event.model';
import type { EventSeatUsageSnapshot } from '../../../../domain/repositories/event-repository.interface';

export class EventPersistenceMapper extends PersistenceMapper<Event, EventModel, EventModelData> {
  public toDomain({ record }: ToDomainParams<EventModel>): Event {
    return Event.reconstitute({
      props: {
        slug: EventSlug.reconstitute(record.slug),
        title: EventTitle.reconstitute(record.title),
        summary: EventSummary.reconstitute(record.summary),
        description: EventDescription.reconstitute(record.description),
        imageUrl: ImageUrl.reconstitute(record.image_url),
        period: EventPeriod.reconstitute({
          startDate: toIsoDate(record.start_date),
          endDate: toIsoDate(record.end_date),
          startTime: toIsoTime(record.start_time),
          endTime: toIsoTime(record.end_time),
        }),
        location: EventLocation.reconstitute({
          isOnline: record.is_online,
          onlineUrl: record.online_url,
          venueName: record.venue_name,
          address: record.address,
          city: record.city,
          state: record.state,
        }),
        capacity: EventCapacity.reconstitute(record.capacity),
        registrationWindow: RegistrationWindow.reconstitute({
          start: new Date(record.registration_start),
          end: new Date(record.registration_end),
        }),
        responsible: Responsible.reconstitute({
          name: record.responsible_name,
          email: record.responsible_email,
        }),
        workload: WorkloadHours.reconstitute(Number(record.workload_hours)),
        type: EventType.reconstitute(record.type as 'GRATUITO' | 'PAGO'),
        status: EventStatus.reconstitute(record.status as EventStatusValue),
        certificate: CertificateSettings.reconstitute({
          enabled: record.certificate_enabled,
          text: record.certificate_text,
          template: record.certificate_template,
          requiresAttendance: record.certificate_requires_attendance,
          minAttendancePct: record.certificate_min_attendance_pct,
        }),
        waitlist: WaitlistSettings.reconstitute({
          enabled: record.waitlist_enabled,
          autoPromote: false,
        }),
        payment: PaymentSettings.reconstitute({
          seatReservationMinutes: record.seat_reservation_minutes,
          maxInstallments: record.max_installments,
          allowPix: record.allow_pix,
          allowBoleto: record.allow_boleto,
          allowCreditCard: record.allow_credit_card,
          minInstallmentCents: record.min_installment_cents,
        }),
        formVersion: record.form_version,
        createdBy: record.created_by,
        publishedAt: record.published_at,
        cancelledAt: record.cancelled_at,
        cancelReason: record.cancel_reason,
      },
      id: Identifier.fromExisting(record.id),
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  }

  public toPersistence({ entity }: ToPersistenceParams<Event>): EventModelData {
    return {
      id: entity.id.toString(),
      slug: entity.slug.value,
      title: entity.title.value,
      summary: entity.summary.value,
      description: entity.description.value,
      image_url: entity.imageUrl.value,
      start_date: new Date(`${entity.period.startDate}T00:00:00.000Z`),
      end_date: new Date(`${entity.period.endDate}T00:00:00.000Z`),
      start_time: entity.period.startTime,
      end_time: entity.period.endTime,
      is_online: entity.location.isOnline,
      online_url: entity.location.onlineUrl,
      venue_name: entity.location.venueName,
      address: entity.location.address,
      city: entity.location.city,
      state: entity.location.state,
      capacity: entity.capacity.value,
      registration_start: entity.registrationWindow.start,
      registration_end: entity.registrationWindow.end,
      responsible_name: entity.responsible.name,
      responsible_email: entity.responsible.email,
      workload_hours: String(entity.workload.value),
      type: entity.type.value,
      status: entity.status.value,
      certificate_enabled: entity.certificateSettings.enabled,
      certificate_text: entity.certificateSettings.text,
      certificate_template: entity.certificateSettings.template,
      certificate_requires_attendance: entity.certificateSettings.requiresAttendance,
      certificate_min_attendance_pct: entity.certificateSettings.minAttendancePct,
      waitlist_enabled: entity.waitlistSettings.enabled,
      seat_reservation_minutes: entity.paymentSettings.seatReservationMinutes,
      max_installments: entity.paymentSettings.maxInstallments,
      allow_pix: entity.paymentSettings.allowPix,
      allow_boleto: entity.paymentSettings.allowBoleto,
      allow_credit_card: entity.paymentSettings.allowCreditCard,
      min_installment_cents: entity.paymentSettings.minInstallmentCents,
      form_version: entity.formVersion,
      created_by: entity.createdBy,
      published_at: entity.publishedAt,
      cancelled_at: entity.cancelledAt,
      cancel_reason: entity.cancelReason,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }

  public mapSeatUsage({ record }: { record: EventSeatUsageModel }): EventSeatUsageSnapshot {
    return {
      eventId: record.event_id,
      capacity: Number(record.capacity),
      occupiedSeats: Number(record.occupied_seats),
      reservedSeats: Number(record.reserved_seats),
      waitlistCount: Number(record.waitlist_count),
      availableSeats: Number(record.available_seats),
    };
  }
}

export class EventLotePersistenceMapper extends PersistenceMapper<EventLote, EventLoteModel, EventLoteModel> {
  public toDomain({ record }: ToDomainParams<EventLoteModel>): EventLote {
    return EventLote.reconstitute({
      props: {
        eventId: record.event_id,
        name: record.name,
        description: record.description,
        startDate: new Date(record.start_date),
        endDate: new Date(record.end_date),
        maxQuantity: record.max_quantity,
        price: MoneyVO.reconstitute({ cents: record.price_cents }),
        isActive: record.is_active,
        orderIndex: record.order_index,
        soldQuantity: Number(record.sold_quantity ?? 0),
      },
      id: Identifier.fromExisting(record.id),
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  }

  public toPersistence({ entity }: ToPersistenceParams<EventLote>): EventLoteModel {
    return {
      id: entity.id.toString(),
      event_id: entity.eventId,
      name: entity.name,
      description: entity.description,
      start_date: entity.startDate,
      end_date: entity.endDate,
      max_quantity: entity.maxQuantity,
      price_cents: entity.price.cents,
      is_active: entity.isActive,
      order_index: entity.orderIndex,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }
}

export class EventFormFieldPersistenceMapper extends PersistenceMapper<
  EventFormField,
  EventFormFieldModel,
  EventFormFieldModel
> {
  public toDomain({ record }: ToDomainParams<EventFormFieldModel>): EventFormField {
    return EventFormField.reconstitute({
      props: {
        eventId: record.event_id,
        fieldKey: record.field_key,
        label: record.label,
        description: record.description,
        fieldType: FormFieldType.reconstitute(record.field_type as FormFieldTypeValue),
        isRequired: record.is_required,
        orderIndex: record.order_index,
        options: record.options ?? [],
        placeholder: record.placeholder,
        isActive: record.is_active,
      },
      id: Identifier.fromExisting(record.id),
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  }

  public toPersistence({ entity }: ToPersistenceParams<EventFormField>): EventFormFieldModel {
    return {
      id: entity.id.toString(),
      event_id: entity.eventId,
      field_key: entity.fieldKey,
      label: entity.label,
      description: entity.description,
      field_type: entity.fieldType.value,
      is_required: entity.isRequired,
      order_index: entity.orderIndex,
      options: entity.options,
      placeholder: entity.placeholder,
      is_active: entity.isActive,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }
}

export class EventSpeakerPersistenceMapper extends PersistenceMapper<
  EventSpeaker,
  EventSpeakerModel,
  EventSpeakerModel
> {
  public toDomain({ record }: ToDomainParams<EventSpeakerModel>): EventSpeaker {
    return EventSpeaker.reconstitute({
      props: {
        eventId: record.event_id,
        name: record.name,
        bio: record.bio,
        photoUrl: record.photo_url,
        institution: record.institution,
        orderIndex: record.order_index,
      },
      id: Identifier.fromExisting(record.id),
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  }

  public toPersistence({ entity }: ToPersistenceParams<EventSpeaker>): EventSpeakerModel {
    return {
      id: entity.id.toString(),
      event_id: entity.eventId,
      name: entity.name,
      bio: entity.bio,
      photo_url: entity.photoUrl,
      institution: entity.institution,
      order_index: entity.orderIndex,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }
}

export class EventActivityPersistenceMapper extends PersistenceMapper<
  EventActivity,
  EventActivityModel,
  EventActivityModel
> {
  public toDomain({ record }: ToDomainParams<EventActivityModel>): EventActivity {
    return EventActivity.reconstitute({
      props: {
        eventId: record.event_id,
        speakerId: record.speaker_id,
        title: record.title,
        description: record.description,
        startAt: new Date(record.start_at),
        endAt: new Date(record.end_at),
        room: record.room,
        orderIndex: record.order_index,
      },
      id: Identifier.fromExisting(record.id),
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  }

  public toPersistence({ entity }: ToPersistenceParams<EventActivity>): EventActivityModel {
    return {
      id: entity.id.toString(),
      event_id: entity.eventId,
      speaker_id: entity.speakerId,
      title: entity.title,
      description: entity.description,
      start_at: entity.startAt,
      end_at: entity.endAt,
      room: entity.room,
      order_index: entity.orderIndex,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }
}

function toIsoDate(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toIsoTime(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().slice(11, 16);
  return String(value).slice(0, 5);
}
