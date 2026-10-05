import { UseCase } from '@core/application/use-case.base';
import { EVENT_CATALOG } from '@core/contracts/event-catalog.contract';
import type { IEventCatalog } from '@core/contracts/event-catalog.contract';
import { PARTICIPANT_GATEWAY } from '@core/contracts/participant-gateway.contract';
import type { IParticipantGateway } from '@core/contracts/participant-gateway.contract';
import { Result } from '@core/domain/result';
import type { Registration } from '../../../domain/entities/registration.entity';
import { RegistrationNotFoundError } from '../../../domain/errors/registration-not-found.error';
import { REGISTRATION_REPOSITORY } from '../../../domain/repositories/registration-repository.interface';
import type { IRegistrationRepository } from '../../../domain/repositories/registration-repository.interface';
import { CredentialService } from '../../services/credential.service';
import { RegistrationMapper } from '../../mappers/registration.mapper';
import type { GetRegistrationInputDto } from './get-registration.input.dto';
import type { GetRegistrationOutputDto } from './get-registration.output.dto';

export type GetRegistrationDependencies = {
  registrationRepository: IRegistrationRepository;
  eventCatalog: IEventCatalog;
  participantGateway: IParticipantGateway;
  credentialService: CredentialService;
  mapper: RegistrationMapper;
};

export class GetRegistrationUseCase extends UseCase<GetRegistrationInputDto, GetRegistrationOutputDto> {
  private readonly dependencies: GetRegistrationDependencies;

  constructor(dependencies: GetRegistrationDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: GetRegistrationInputDto): Promise<Result<GetRegistrationOutputDto>> {
    const registration = await this.load(input);
    if (!registration) return Result.fail(new RegistrationNotFoundError(input.code ?? input.registrationId ?? ''));

    const { eventCatalog, participantGateway, credentialService, mapper } = this.dependencies;
    const eventId = registration.eventId;

    const [rules, participant] = await Promise.all([
      eventCatalog.getRegistrationRules({ eventId }),
      participantGateway.findById({ id: registration.participantId }),
    ]);

    let credential = null;
    if (registration.status.allowsCheckIn()) {
      const credentialResult = await credentialService.execute({ registration });
      if (credentialResult.isSuccess) {
        credential = {
          code: credentialResult.value.code,
          token: credentialResult.value.token,
          credentialUrl: credentialResult.value.credentialUrl,
        };
      }
    }

    return Result.ok({
      registration: mapper.map({ registration }),
      participant: participant
        ? { id: participant.id, name: participant.name, email: participant.email, cpf: participant.cpf }
        : null,
      event: rules
        ? { id: rules.eventId, title: rules.title, slug: rules.slug, type: rules.type, status: rules.status }
        : null,
      credential,
    });
  }

  private async load(input: GetRegistrationInputDto): Promise<Registration | null> {
    if (input.code) return this.dependencies.registrationRepository.findByCode(input.code);
    if (input.registrationId) return this.dependencies.registrationRepository.findById(input.registrationId);
    return null;
  }
}
