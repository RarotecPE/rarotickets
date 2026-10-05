import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { Result } from '@core/domain/result';
import { EventNotFoundError } from '../../../domain/errors/event-not-found.error';
import { EVENT_REPOSITORY } from '../../../domain/repositories/event-repository.interface';
import type { IEventRepository } from '../../../domain/repositories/event-repository.interface';
import { EventMapper } from '../../mappers/event.mapper';
import type { UpdateEventInputDto } from './update-event.input.dto';
import type { UpdateEventOutputDto } from './update-event.output.dto';

export type UpdateEventDependencies = {
  eventRepository: IEventRepository;
  auditRecorder: IAuditRecorder;
  mapper: EventMapper;
};

export class UpdateEventUseCase extends UseCase<UpdateEventInputDto, UpdateEventOutputDto> {
  private readonly eventRepository: IEventRepository;
  private readonly auditRecorder: IAuditRecorder;
  private readonly mapper: EventMapper;

  constructor(dependencies: UpdateEventDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
    this.auditRecorder = dependencies.auditRecorder;
    this.mapper = dependencies.mapper;
  }

  async execute(input: UpdateEventInputDto): Promise<Result<UpdateEventOutputDto>> {
    const event = await this.eventRepository.findById(input.eventId);
    if (!event) return Result.fail(new EventNotFoundError({ eventId: input.eventId }));

    const before = this.mapper.map({ event, includeDescription: true });
    const fields = input.fields;

    const updateResult = event.updateDetails({
      ...(fields.title !== undefined ? { title: fields.title } : {}),
      ...(fields.summary !== undefined ? { summary: fields.summary } : {}),
      ...(fields.description !== undefined ? { description: fields.description } : {}),
      ...(fields.imageUrl !== undefined ? { imageUrl: fields.imageUrl } : {}),
      ...(fields.startDate !== undefined && fields.endDate !== undefined && fields.startTime !== undefined && fields.endTime !== undefined
        ? {
            period: {
              startDate: fields.startDate,
              endDate: fields.endDate,
              startTime: fields.startTime,
              endTime: fields.endTime,
            },
          }
        : {}),
      ...(fields.isOnline !== undefined
        ? {
            location: {
              isOnline: fields.isOnline,
              onlineUrl: fields.onlineUrl ?? event.location.onlineUrl,
              venueName: fields.venueName ?? event.location.venueName,
              address: fields.address ?? event.location.address,
              city: fields.city ?? event.location.city,
              state: fields.state ?? event.location.state,
            },
          }
        : {}),
      ...(fields.registrationStart !== undefined && fields.registrationEnd !== undefined
        ? { registrationWindow: { start: fields.registrationStart, end: fields.registrationEnd } }
        : {}),
      ...(fields.responsibleName !== undefined
        ? { responsible: { name: fields.responsibleName, email: fields.responsibleEmail ?? event.responsible.email } }
        : {}),
      ...(fields.workloadHours !== undefined ? { workloadHours: fields.workloadHours } : {}),
      ...(fields.certificateEnabled !== undefined || fields.certificateText !== undefined || fields.certificateRequiresAttendance !== undefined
        ? {
            certificate: {
              enabled: fields.certificateEnabled ?? event.certificateSettings.enabled,
              text: fields.certificateText ?? event.certificateSettings.text,
              template: event.certificateSettings.template,
              requiresAttendance: fields.certificateRequiresAttendance ?? event.certificateSettings.requiresAttendance,
              minAttendancePct: event.certificateSettings.minAttendancePct,
            },
          }
        : {}),
      ...(fields.waitlistEnabled !== undefined
        ? { waitlist: { enabled: fields.waitlistEnabled, autoPromote: fields.waitlistAutoPromote ?? false } }
        : {}),
      ...(fields.seatReservationMinutes !== undefined ||
      fields.maxInstallments !== undefined ||
      fields.allowPix !== undefined ||
      fields.allowBoleto !== undefined ||
      fields.allowCreditCard !== undefined ||
      fields.minInstallmentCents !== undefined
        ? {
            payment: {
              seatReservationMinutes: fields.seatReservationMinutes ?? event.paymentSettings.seatReservationMinutes,
              maxInstallments: fields.maxInstallments ?? event.paymentSettings.maxInstallments,
              allowPix: fields.allowPix ?? event.paymentSettings.allowPix,
              allowBoleto: fields.allowBoleto ?? event.paymentSettings.allowBoleto,
              allowCreditCard: fields.allowCreditCard ?? event.paymentSettings.allowCreditCard,
              minInstallmentCents: fields.minInstallmentCents ?? event.paymentSettings.minInstallmentCents,
            },
          }
        : {}),
    });
    if (updateResult.isFailure) return Result.fail(updateResult.error);

    if (fields.capacity !== undefined && fields.capacity !== event.capacity.value) {
      const usage = await this.eventRepository.getSeatUsage(event.id.toString());
      const capacityResult = event.changeCapacity({
        capacity: fields.capacity,
        occupiedSeats: usage?.occupiedSeats ?? 0,
      });
      if (capacityResult.isFailure) return Result.fail(capacityResult.error);
    }

    await this.eventRepository.update(event);

    await this.auditRecorder.record({
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      action: 'EVENT_UPDATED',
      entity: 'event',
      entityId: event.id.toString(),
      description: `Evento "${event.title.value}" atualizado`,
      before: { title: before.title, capacity: before.capacity, startDate: before.startDate },
      after: { title: event.title.value, capacity: event.capacity.value, startDate: event.period.startDate },
      ip: input.ip ?? null,
    });

    return Result.ok({ event: this.mapper.map({ event, includeDescription: true }) });
  }
}
