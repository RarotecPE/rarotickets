import { UseCase } from '../../../../../@core/application/use-case.base';
import { Result } from '../../../../../@core/domain/result';
import { Event } from '../../../domain/entities/event.entity';
import type { IEventRepository } from '../../../domain/repositories/event-repository.interface';
import { EventMapper } from '../../mappers/event.mapper';
import type { CreateEventInputDto } from './create-event.input.dto';
import type { CreateEventOutputDto } from './create-event.output.dto';

export type CreateEventDependencies = {
  eventRepository: IEventRepository;
  eventMapper: EventMapper;
};

export class CreateEventUseCase extends UseCase<CreateEventInputDto, CreateEventOutputDto> {
  private readonly eventRepository: IEventRepository;
  private readonly eventMapper: EventMapper;

  constructor(dependencies: CreateEventDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
    this.eventMapper = dependencies.eventMapper;
  }

  async execute(input: CreateEventInputDto): Promise<Result<CreateEventOutputDto>> {
    const eventResult = Event.create(input);
    if (eventResult.isFailure) return Result.fail(eventResult.error);
    await this.eventRepository.save(eventResult.value);
    return Result.ok({ event: this.eventMapper.map({ event: eventResult.value }) });
  }
}
