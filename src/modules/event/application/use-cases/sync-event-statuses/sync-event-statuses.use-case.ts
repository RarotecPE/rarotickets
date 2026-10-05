import { UseCase } from '@core/application/use-case.base';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { Result } from '@core/domain/result';
import { EVENT_REPOSITORY } from '../../../domain/repositories/event-repository.interface';
import type { IEventRepository } from '../../../domain/repositories/event-repository.interface';
import type { SyncEventStatusesInputDto } from './sync-event-statuses.input.dto';
import type { SyncEventStatusesOutputDto } from './sync-event-statuses.output.dto';

export type SyncEventStatusesDependencies = { eventRepository: IEventRepository; clock: IClock };

/**
 * Expiração automática de prazos do evento (§39): abre e encerra inscrições,
 * marca eventos em andamento e finalizados conforme o relógio.
 */
export class SyncEventStatusesUseCase extends UseCase<SyncEventStatusesInputDto, SyncEventStatusesOutputDto> {
  private readonly eventRepository: IEventRepository;
  private readonly clock: IClock;

  constructor(dependencies: SyncEventStatusesDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
    this.clock = dependencies.clock;
  }

  async execute(input: SyncEventStatusesInputDto): Promise<Result<SyncEventStatusesOutputDto>> {
    const at = input.referenceDate ? new Date(input.referenceDate) : this.clock.now();
    const events = await this.eventRepository.listForStatusSync(at);
    const changed: Array<{ eventId: string; from: string; to: string }> = [];

    for (const event of events) {
      const from = event.status.value;
      const hasChanged = event.syncStatusWithClock(at);
      if (!hasChanged) continue;

      await this.eventRepository.update(event);
      changed.push({ eventId: event.id.toString(), from, to: event.status.value });
    }

    return Result.ok({ checked: events.length, changed });
  }
}
