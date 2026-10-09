import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { EventReadModel, EventRepository, GetPublicEventParams } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";

export type GetPublicEventInputDto = GetPublicEventParams;
export type GetPublicEventOutputDto = EventReadModel | null;
export type GetPublicEventDependencies = { eventRepository: EventRepository };

export class GetPublicEventUseCase extends UseCase<GetPublicEventInputDto, GetPublicEventOutputDto> {
  private readonly eventRepository: EventRepository;
  constructor(dependencies: GetPublicEventDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
  }
  async execute(input: GetPublicEventInputDto): Promise<Result<GetPublicEventOutputDto>> {
    return Result.ok(await this.eventRepository.getPublicBySlug(input));
  }
}
