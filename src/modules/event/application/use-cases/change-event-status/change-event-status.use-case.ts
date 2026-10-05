import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { NOTIFICATION_GATEWAY } from '@core/contracts/notification.contract';
import type { INotificationGateway } from '@core/contracts/notification.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { Result } from '@core/domain/result';
import { EventNotFoundError } from '../../../domain/errors/event-not-found.error';
import { EVENT_REPOSITORY } from '../../../domain/repositories/event-repository.interface';
import type { IEventRepository } from '../../../domain/repositories/event-repository.interface';
import { EventMapper } from '../../mappers/event.mapper';
import type { ChangeEventStatusInputDto } from './change-event-status.input.dto';
import type { ChangeEventStatusOutputDto } from './change-event-status.output.dto';

export type ChangeEventStatusDependencies = {
  eventRepository: IEventRepository;
  auditRecorder: IAuditRecorder;
  notificationGateway: INotificationGateway;
  clock: IClock;
  mapper: EventMapper;
};

/**
 * Altera o status do evento: publicar, abrir/encerrar inscrições, iniciar,
 * finalizar ou cancelar (§2). Toda alteração relevante é auditada (§36).
 */
export class ChangeEventStatusUseCase extends UseCase<ChangeEventStatusInputDto, ChangeEventStatusOutputDto> {
  private readonly eventRepository: IEventRepository;
  private readonly auditRecorder: IAuditRecorder;
  private readonly notificationGateway: INotificationGateway;
  private readonly clock: IClock;
  private readonly mapper: EventMapper;

  constructor(dependencies: ChangeEventStatusDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
    this.auditRecorder = dependencies.auditRecorder;
    this.notificationGateway = dependencies.notificationGateway;
    this.clock = dependencies.clock;
    this.mapper = dependencies.mapper;
  }

  async execute(input: ChangeEventStatusInputDto): Promise<Result<ChangeEventStatusOutputDto>> {
    const event = await this.eventRepository.findById(input.eventId);
    if (!event) return Result.fail(new EventNotFoundError({ eventId: input.eventId }));

    const previousStatus = event.status.value;
    const statusResult = event.changeStatus({
      next: input.nextStatus as never,
      at: this.clock.now(),
      reason: input.reason ?? null,
    });
    if (statusResult.isFailure) return Result.fail(statusResult.error);

    await this.eventRepository.update(event);

    await this.auditRecorder.record({
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      action: event.status.isCancelled() ? 'EVENT_CANCELLED' : 'EVENT_STATUS_CHANGED',
      entity: 'event',
      entityId: event.id.toString(),
      description: `Status do evento alterado de ${previousStatus} para ${event.status.value}`,
      before: { status: previousStatus },
      after: { status: event.status.value, reason: input.reason ?? null },
      ip: input.ip ?? null,
    });

    await this.notificationGateway.send({
      template: event.status.isCancelled() ? 'EVENTO_CANCELADO' : 'ALTERACAO_NO_EVENTO',
      eventId: event.id.toString(),
      variables: {
        evento: event.title.value,
        status: event.status.label,
        motivo: input.reason ?? '',
      },
    });

    return Result.ok({ event: this.mapper.map({ event, includeDescription: true }) });
  }
}
