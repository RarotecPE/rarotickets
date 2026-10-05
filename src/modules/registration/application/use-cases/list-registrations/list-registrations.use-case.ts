import { buildPaginationMeta, normalizePagination } from '@core/application/pagination/pagination';
import { UseCase } from '@core/application/use-case.base';
import { EVENT_CATALOG } from '@core/contracts/event-catalog.contract';
import type { IEventCatalog } from '@core/contracts/event-catalog.contract';
import { PARTICIPANT_GATEWAY } from '@core/contracts/participant-gateway.contract';
import type { IParticipantGateway } from '@core/contracts/participant-gateway.contract';
import { Result } from '@core/domain/result';
import type { RegistrationStatusValue } from '../../../domain/value-objects/registration-status.vo';
import { REGISTRATION_REPOSITORY } from '../../../domain/repositories/registration-repository.interface';
import type { IRegistrationRepository } from '../../../domain/repositories/registration-repository.interface';
import { RegistrationMapper } from '../../mappers/registration.mapper';
import type { ListRegistrationsInputDto } from './list-registrations.input.dto';
import type { ListRegistrationsOutputDto } from './list-registrations.output.dto';

export type ListRegistrationsDependencies = {
  registrationRepository: IRegistrationRepository;
  participantGateway: IParticipantGateway;
  eventCatalog: IEventCatalog;
  mapper: RegistrationMapper;
};

export class ListRegistrationsUseCase extends UseCase<ListRegistrationsInputDto, ListRegistrationsOutputDto> {
  private readonly dependencies: ListRegistrationsDependencies;

  constructor(dependencies: ListRegistrationsDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: ListRegistrationsInputDto): Promise<Result<ListRegistrationsOutputDto>> {
    const pagination = normalizePagination({ page: input.page, perPage: input.perPage });
    const { registrationRepository, participantGateway, eventCatalog, mapper } = this.dependencies;

    const { registrations, total } = await registrationRepository.list({
      eventId: input.eventId ?? null,
      participantId: input.participantId ?? null,
      status: (input.status as RegistrationStatusValue | null) ?? null,
      search: input.search ?? null,
      includingCancelled: input.includingCancelled ?? false,
      page: pagination.page,
      perPage: pagination.perPage,
    });

    const eventIds = [...new Set(registrations.map((registration) => registration.eventId))];
    const rulesByEvent = new Map(
      (
        await Promise.all(eventIds.map((eventId) => eventCatalog.getRegistrationRules({ eventId })))
      )
        .filter((rules) => rules !== null)
        .map((rules) => [rules.eventId, rules]),
    );

    const items = await Promise.all(
      registrations.map(async (registration) => {
        const participant = await participantGateway.findById({ id: registration.participantId });
        return {
          ...mapper.map({ registration }),
          participantName: participant?.name ?? null,
          participantEmail: participant?.email ?? null,
          eventTitle: rulesByEvent.get(registration.eventId)?.title ?? null,
        };
      }),
    );

    return Result.ok({
      registrations: items,
      meta: buildPaginationMeta({ ...pagination, total }),
    });
  }
}
