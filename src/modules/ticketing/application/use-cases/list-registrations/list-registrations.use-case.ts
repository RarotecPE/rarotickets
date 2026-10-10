import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { RegistrationListResult, RegistrationRepository } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";

export type ListRegistrationsInputDto = { eventId?: string; eventIds?: string[]; query?: string; status?: string; page: number; pageSize: number; userId: string; canViewAll: boolean };
export type ListRegistrationsOutputDto = RegistrationListResult;
export type ListRegistrationsDependencies = { registrationRepository: RegistrationRepository };

export class ListRegistrationsUseCase extends UseCase<ListRegistrationsInputDto, ListRegistrationsOutputDto> {
  private readonly registrationRepository: RegistrationRepository;
  constructor(dependencies: ListRegistrationsDependencies) {
    super();
    this.registrationRepository = dependencies.registrationRepository;
  }
  async execute(input: ListRegistrationsInputDto): Promise<Result<ListRegistrationsOutputDto>> {
    return Result.ok(await this.registrationRepository.list({ eventId: input.eventId, eventIds: input.eventIds, query: input.query, status: input.status, page: input.page, pageSize: input.pageSize, userId: input.userId, canViewAll: input.canViewAll }));
  }
}
