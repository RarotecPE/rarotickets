import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { Result } from '@core/domain/result';
import { EventLote } from '../../../domain/entities/event-lote.entity';
import { EventNotFoundError } from '../../../domain/errors/event-not-found.error';
import { EVENT_LOTE_REPOSITORY } from '../../../domain/repositories/event-lote-repository.interface';
import type { IEventLoteRepository } from '../../../domain/repositories/event-lote-repository.interface';
import { EVENT_REPOSITORY } from '../../../domain/repositories/event-repository.interface';
import type { IEventRepository } from '../../../domain/repositories/event-repository.interface';
import { EventMapper } from '../../mappers/event.mapper';
import type { ManageEventLoteInputDto } from './manage-event-lote.input.dto';
import type { ManageEventLoteOutputDto } from './manage-event-lote.output.dto';

export type ManageEventLoteDependencies = {
  eventRepository: IEventRepository;
  loteRepository: IEventLoteRepository;
  auditRecorder: IAuditRecorder;
  mapper: EventMapper;
};

/** Cria/atualiza lotes do evento pago (§5). */
export class ManageEventLoteUseCase extends UseCase<ManageEventLoteInputDto, ManageEventLoteOutputDto> {
  private readonly dependencies: ManageEventLoteDependencies;

  constructor(dependencies: ManageEventLoteDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: ManageEventLoteInputDto): Promise<Result<ManageEventLoteOutputDto>> {
    const { eventRepository, loteRepository, auditRecorder, mapper } = this.dependencies;

    const event = await eventRepository.findById(input.eventId);
    if (!event) return Result.fail(new EventNotFoundError({ eventId: input.eventId }));
    if (event.status.isCancelled() || event.status.isFinished()) {
      return Result.fail(new Error('Evento cancelado ou finalizado não aceita alteração de lotes'));
    }
    if (event.status.value === 'EM_ANDAMENTO') {
      return Result.fail(new Error('Evento em andamento não aceita alteração de lotes'));
    }

    if (input.action === 'CREATE') {
      const loteResult = EventLote.create({
        eventId: input.eventId,
        name: input.name,
        description: input.description ?? null,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        maxQuantity: input.maxQuantity,
        priceCents: input.priceCents,
        isActive: input.isActive ?? true,
        orderIndex: input.orderIndex ?? 0,
      });
      if (loteResult.isFailure) return Result.fail(loteResult.error);

      await loteRepository.save(loteResult.value);
      await this.audit(input, 'EVENT_LOTE_CREATED', `Lote "${loteResult.value.name}" criado`, null, {
        name: loteResult.value.name,
        priceCents: loteResult.value.price.cents,
        maxQuantity: loteResult.value.maxQuantity,
      });

      return Result.ok({ lote: mapper.mapLote({ lote: loteResult.value }) });
    }

    if (!input.loteId) return Result.fail(new Error('Lote não informado para atualização'));
    const lote = await loteRepository.findById(input.loteId);
    if (!lote || lote.eventId !== input.eventId) return Result.fail(new Error('Lote não encontrado para este evento'));

    const before = { name: lote.name, priceCents: lote.price.cents, maxQuantity: lote.maxQuantity, isActive: lote.isActive };
    const updateResult = lote.update({
      name: input.name,
      description: input.description ?? null,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      maxQuantity: input.maxQuantity,
      priceCents: input.priceCents,
      isActive: input.isActive,
      orderIndex: input.orderIndex,
    });
    if (updateResult.isFailure) return Result.fail(updateResult.error);

    await loteRepository.update(lote);
    await this.audit(input, 'EVENT_LOTE_UPDATED', `Lote "${lote.name}" atualizado`, before, {
      name: lote.name,
      priceCents: lote.price.cents,
      maxQuantity: lote.maxQuantity,
      isActive: lote.isActive,
    });

    return Result.ok({ lote: mapper.mapLote({ lote }) });
  }

  private async audit(
    input: ManageEventLoteInputDto,
    action: string,
    description: string,
    before: Record<string, unknown> | null,
    after: Record<string, unknown>,
  ): Promise<void> {
    await this.dependencies.auditRecorder.record({
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      action,
      entity: 'event_lote',
      entityId: input.loteId ?? input.eventId,
      description,
      before,
      after,
      ip: input.ip ?? null,
    });
  }
}
