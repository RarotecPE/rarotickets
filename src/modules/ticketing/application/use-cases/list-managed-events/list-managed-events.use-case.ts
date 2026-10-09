import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { EventReadModel, EventRepository, ListManagedEventsParams } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";

export type ListManagedEventsInputDto = ListManagedEventsParams;
export type ListManagedEventsOutputDto = EventReadModel[];
export type ListManagedEventsDependencies = { eventRepository: EventRepository };

export class ListManagedEventsUseCase extends UseCase<ListManagedEventsInputDto, ListManagedEventsOutputDto> {
  private readonly eventRepository: EventRepository;
  constructor(dependencies: ListManagedEventsDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
  }
  async execute(input: ListManagedEventsInputDto): Promise<Result<ListManagedEventsOutputDto>> {
    return Result.ok(await this.eventRepository.listManaged(input));
  }
}
