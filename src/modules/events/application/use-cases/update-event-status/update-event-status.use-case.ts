import { UseCase } from '../../../../../@core/application/use-case.base';
import { Result } from '../../../../../@core/domain/result';
import { EventNotFoundError } from '../../../domain/errors/event-not-found.error';
import { InvalidEventStatusError } from '../../../domain/errors/invalid-event-status.error';
import type { IEventRepository } from '../../../domain/repositories/event-repository.interface';
import { isEventStatus } from '../../../domain/value-objects/event-status.vo';
import { EventMapper } from '../../mappers/event.mapper';
import type { UpdateEventStatusInputDto } from './update-event-status.input.dto';
import type { UpdateEventStatusOutputDto } from './update-event-status.output.dto';

export type UpdateEventStatusDependencies = {
  eventRepository: IEventRepository;
  eventMapper: EventMapper;
};

export class UpdateEventStatusUseCase extends UseCase<UpdateEventStatusInputDto, UpdateEventStatusOutputDto> {
  private readonly eventRepository: IEventRepository;
  private readonly eventMapper: EventMapper;

  constructor(dependencies: UpdateEventStatusDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
    this.eventMapper = dependencies.eventMapper;
  }

  async execute(input: UpdateEventStatusInputDto): Promise<Result<UpdateEventStatusOutputDto>> {
    if (!isEventStatus(input.status)) return Result.fail(new InvalidEventStatusError());
    const event = await this.eventRepository.findById(input.eventId);
    if (!event) return Result.fail(new EventNotFoundError({ eventId: input.eventId }));
    const changeResult = event.changeStatus({ status: input.status });
    if (changeResult.isFailure) return Result.fail(changeResult.error);
    await this.eventRepository.update(event);
    return Result.ok({ event: this.eventMapper.map({ event }) });
  }
}
