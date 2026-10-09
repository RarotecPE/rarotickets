import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import { RegistrationRepository } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import type { ParticipantPortalView } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import type { ICredentialProvider } from "@/modules/ticketing/domain/services/credential-provider.interface";

export type GetParticipantPortalInputDto = { accessToken: string };
export type GetParticipantPortalOutputDto = ParticipantPortalView;
export type GetParticipantPortalDependencies = { registrationRepository: RegistrationRepository; credentialProvider: ICredentialProvider };

export class GetParticipantPortalUseCase extends UseCase<GetParticipantPortalInputDto, GetParticipantPortalOutputDto> {
  private readonly registrationRepository: RegistrationRepository;
  private readonly credentialProvider: ICredentialProvider;
  constructor(dependencies: GetParticipantPortalDependencies) {
    super();
    this.registrationRepository = dependencies.registrationRepository;
    this.credentialProvider = dependencies.credentialProvider;
  }
  async execute(input: GetParticipantPortalInputDto): Promise<Result<GetParticipantPortalOutputDto>> {
    const tokenHash = this.credentialProvider.hashToken({ token: input.accessToken });
    const portal = await this.registrationRepository.findPortal({ accessTokenHash: tokenHash });
    if (!portal) return Result.fail(new Error("Este link não é válido ou expirou."));
    if (portal.status !== "confirmada") return Result.ok(portal);
    const qrPayload = this.credentialProvider.createQrToken({ registrationId: portal.registrationId });
    return Result.ok({ ...portal, qrPayload, credentialToken: qrPayload });
  }
}
