import type {
  EventCertificateSettings,
  EventFormSnapshot,
  EventRegistrationRules,
  EventSeatUsage,
  IEventCatalog,
  LoteSnapshot,
} from '@core/contracts/event-catalog.contract';
import type { EventRepository } from '../../../domain/repositories/event-repository.base';
import type { EventLoteRepository } from '../../../domain/repositories/event-lote-repository.base';
import type { EventFormRepository } from '../../../domain/repositories/event-form-repository.base';

export type EventCatalogDependencies = {
  eventRepository: EventRepository;
  loteRepository: EventLoteRepository;
  formRepository: EventFormRepository;
};

/**
 * Adaptador (ACL) que expõe o contexto de eventos para outros contextos,
 * como o fluxo de inscrições — sem imports diretos entre módulos.
 */
export class EventCatalogAdapter implements IEventCatalog {
  private readonly dependencies: EventCatalogDependencies;

  constructor(dependencies: EventCatalogDependencies) {
    this.dependencies = dependencies;
  }

  async findEventIdBySlug(params: { slug: string }): Promise<string | null> {
    const event = await this.dependencies.eventRepository.findBySlug(params.slug);
    return event ? event.id.toString() : null;
  }

  async getRegistrationRules(params: { eventId: string }): Promise<EventRegistrationRules | null> {
    const event = await this.dependencies.eventRepository.findById(params.eventId);
    if (!event) return null;

    return {
      eventId: event.id.toString(),
      title: event.title.value,
      slug: event.slug.value,
      status: event.status.value,
      type: event.type.value,
      capacity: event.capacity.value,
      registrationStart: event.registrationWindow.start,
      registrationEnd: event.registrationWindow.end,
      waitlistEnabled: event.waitlistSettings.enabled,
      seatReservationMinutes: event.paymentSettings.seatReservationMinutes,
      allowPix: event.paymentSettings.allowPix,
      allowBoleto: event.paymentSettings.allowBoleto,
      allowCreditCard: event.paymentSettings.allowCreditCard,
      maxInstallments: event.paymentSettings.maxInstallments,
      minInstallmentCents: event.paymentSettings.minInstallmentCents,
      certificateEnabled: event.certificateSettings.enabled,
      certificateRequiresAttendance: event.certificateSettings.requiresAttendance,
      certificateMinAttendancePct: event.certificateSettings.minAttendancePct,
    };
  }

  async getCertificateSettings(params: { eventId: string }): Promise<EventCertificateSettings | null> {
    const event = await this.dependencies.eventRepository.findById(params.eventId);
    if (!event) return null;

    return {
      eventId: event.id.toString(),
      eventTitle: event.title.value,
      workloadHours: event.workload.value,
      enabled: event.certificateSettings.enabled,
      text: event.certificateSettings.text,
      requiresAttendance: event.certificateSettings.requiresAttendance,
      minAttendancePct: event.certificateSettings.minAttendancePct,
    };
  }

  async getSeatUsage(params: { eventId: string }): Promise<EventSeatUsage | null> {
    const usage = await this.dependencies.eventRepository.getSeatUsage(params.eventId);
    if (!usage) return null;
    return {
      capacity: usage.capacity,
      occupiedSeats: usage.occupiedSeats,
      reservedSeats: usage.reservedSeats,
      waitlistCount: usage.waitlistCount,
      availableSeats: usage.availableSeats,
    };
  }

  async getRegistrationForm(params: { eventId: string }): Promise<EventFormSnapshot | null> {
    const event = await this.dependencies.eventRepository.findById(params.eventId);
    if (!event) return null;

    const fields = await this.dependencies.formRepository.listByEvent({ eventId: params.eventId });
    return {
      eventId: params.eventId,
      version: event.formVersion,
      fields: fields
        .filter((field) => field.isActive)
        .map((field) => ({
          id: field.id.toString(),
          eventId: field.eventId,
          fieldKey: field.fieldKey,
          label: field.label,
          description: field.description,
          fieldType: field.fieldType.value,
          isRequired: field.isRequired,
          orderIndex: field.orderIndex,
          options: field.options,
          placeholder: field.placeholder,
          isActive: field.isActive,
        })),
    };
  }

  async listElegibleLotes(params: { eventId: string; at: Date }): Promise<LoteSnapshot[]> {
    const lotes = await this.dependencies.loteRepository.listByEvent({ eventId: params.eventId });
    return lotes.map((lote) => ({
      id: lote.id.toString(),
      eventId: lote.eventId,
      name: lote.name,
      description: lote.description,
      startDate: lote.startDate,
      endDate: lote.endDate,
      maxQuantity: lote.maxQuantity,
      priceCents: lote.price.cents,
      isActive: lote.isActive,
      orderIndex: lote.orderIndex,
      soldQuantity: lote.soldQuantity,
    }));
  }

  async touchEventVersion(params: { eventId: string }): Promise<void> {
    const event = await this.dependencies.eventRepository.findById(params.eventId);
    if (!event) return;
    event.bumpFormVersion();
    await this.dependencies.eventRepository.update(event);
  }
}
