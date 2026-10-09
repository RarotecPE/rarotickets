import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type {
  ParticipantAuthRepository,
  ParticipantEventItem,
} from "@/modules/ticketing/domain/participants/repositories/participant-auth-repository.interface";

export type GetParticipantEventsInputDto = {
  participantId: string;
};

export type GetParticipantEventsOutputDto = {
  events: ParticipantEventItem[];
};

export type GetParticipantEventsDependencies = {
  participantAuthRepository: ParticipantAuthRepository;
};

export class GetParticipantEventsUseCase extends UseCase<
  GetParticipantEventsInputDto,
  GetParticipantEventsOutputDto
> {
  private readonly repository: ParticipantAuthRepository;

  constructor(dependencies: GetParticipantEventsDependencies) {
    super();
    this.repository = dependencies.participantAuthRepository;
  }

  async execute(
    input: GetParticipantEventsInputDto,
  ): Promise<Result<GetParticipantEventsOutputDto>> {
    if (!input.participantId) {
      return Result.fail(new Error("Identificador do participante ausente."));
    }

    const items = await this.repository.listParticipantEvents(input.participantId);
    return Result.ok({ events: items });
  }
}

