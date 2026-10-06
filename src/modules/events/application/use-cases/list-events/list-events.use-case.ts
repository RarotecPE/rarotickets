import { UseCase } from '../../../../../@core/application/use-case.base';
import { Result } from '../../../../../@core/domain/result';
import type { IEventRepository } from '../../../domain/repositories/event-repository.interface';
import { EventMapper } from '../../mappers/event.mapper';
import type { ListEventsInputDto } from './list-events.input.dto';
import type { ListEventsOutputDto } from './list-events.output.dto';

export type ListEventsDependencies = {
  eventRepository: IEventRepository;
  eventMapper: EventMapper;
};

export class ListEventsUseCase extends UseCase<ListEventsInputDto, ListEventsOutputDto> {
  private readonly eventRepository: IEventRepository;
  private readonly eventMapper: EventMapper;

  constructor(dependencies: ListEventsDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
    this.eventMapper = dependencies.eventMapper;
  }

  async execute(_input: ListEventsInputDto): Promise<Result<ListEventsOutputDto>> {
    const events = await this.eventRepository.findAll();
    return Result.ok({ events: events.map((event) => this.eventMapper.map({ event })) });
  }
}
