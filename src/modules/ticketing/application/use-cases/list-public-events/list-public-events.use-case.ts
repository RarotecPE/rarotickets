import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { EventReadModel, EventRepository, ListPublicEventsParams } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";

export type ListPublicEventsInputDto = ListPublicEventsParams;
export type ListPublicEventsOutputDto = EventReadModel[];
export type ListPublicEventsDependencies = { eventRepository: EventRepository };

export class ListPublicEventsUseCase extends UseCase<ListPublicEventsInputDto, ListPublicEventsOutputDto> {
  private readonly eventRepository: EventRepository;
  constructor(dependencies: ListPublicEventsDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
  }
  async execute(input: ListPublicEventsInputDto): Promise<Result<ListPublicEventsOutputDto>> {
    return Result.ok(await this.eventRepository.listPublic(input));
  }
}
