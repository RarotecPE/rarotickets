import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { EventReadModel, EventRepository } from "@/modules/ticketing/domain/events/repositories/event-repository.interface";

export type GetManagedEventInputDto = { id: string; userId: string; canViewAll: boolean };
export type GetManagedEventOutputDto = EventReadModel;
export type GetManagedEventDependencies = { eventRepository: EventRepository };

export class GetManagedEventUseCase extends UseCase<GetManagedEventInputDto, GetManagedEventOutputDto> {
  private readonly eventRepository: EventRepository;
  constructor(dependencies: GetManagedEventDependencies) {
    super();
    this.eventRepository = dependencies.eventRepository;
  }
  async execute(input: GetManagedEventInputDto): Promise<Result<GetManagedEventOutputDto>> {
    const event = await this.eventRepository.getManagedById({ id: input.id, userId: input.userId, canViewAll: input.canViewAll });
    return event ? Result.ok(event) : Result.fail(new Error("Evento não encontrado ou sem acesso."));
  }
}
