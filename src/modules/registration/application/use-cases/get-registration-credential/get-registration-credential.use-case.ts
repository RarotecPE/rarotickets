import { UseCase } from '@core/application/use-case.base';
import { EVENT_CATALOG } from '@core/contracts/event-catalog.contract';
import type { IEventCatalog } from '@core/contracts/event-catalog.contract';
import { PARTICIPANT_GATEWAY } from '@core/contracts/participant-gateway.contract';
import type { IParticipantGateway } from '@core/contracts/participant-gateway.contract';
import { Result } from '@core/domain/result';
import { CredentialNotAvailableError } from '../../../domain/errors/credential-not-available.error';
import { RegistrationNotFoundError } from '../../../domain/errors/registration-not-found.error';
import { REGISTRATION_REPOSITORY } from '../../../domain/repositories/registration-repository.interface';
import type { IRegistrationRepository } from '../../../domain/repositories/registration-repository.interface';
import { CredentialService } from '../../services/credential.service';
import type { GetRegistrationCredentialInputDto } from './get-registration-credential.input.dto';
import type { GetRegistrationCredentialOutputDto } from './get-registration-credential.output.dto';

export type GetRegistrationCredentialDependencies = {
  registrationRepository: IRegistrationRepository;
  eventCatalog: IEventCatalog;
  participantGateway: IParticipantGateway;
  credentialService: CredentialService;
};

export class GetRegistrationCredentialUseCase extends UseCase<
  GetRegistrationCredentialInputDto,
  GetRegistrationCredentialOutputDto
> {
  private readonly dependencies: GetRegistrationCredentialDependencies;

  constructor(dependencies: GetRegistrationCredentialDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: GetRegistrationCredentialInputDto): Promise<Result<GetRegistrationCredentialOutputDto>> {
    const { registrationRepository, eventCatalog, participantGateway, credentialService } = this.dependencies;

    const registration = input.code
      ? await registrationRepository.findByCode(input.code)
      : input.registrationId
        ? await registrationRepository.findById(input.registrationId)
        : null;
    if (!registration) return Result.fail(new RegistrationNotFoundError(input.code ?? input.registrationId ?? ''));

    const credentialResult = await credentialService.execute({ registration });
    if (credentialResult.isFailure) return Result.fail(new CredentialNotAvailableError());

    const [rules, participant] = await Promise.all([
      eventCatalog.getRegistrationRules({ eventId: registration.eventId }),
      participantGateway.findById({ id: registration.participantId }),
    ]);

    return Result.ok({
      ...credentialResult.value,
      eventTitle: rules?.title ?? null,
      participantName: participant?.name ?? null,
    });
  }
}
