import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { ParticipantAuthRepository } from "@/modules/ticketing/domain/participants/repositories/participant-auth-repository.interface";
import { hashToken } from "@/server/auth/participant-session.service";

export type GetActivationTokenInfoInputDto = {
  rawToken: string;
};

export type GetActivationTokenInfoOutputDto = {
  email: string;
  cpf: string | null;
};

export type GetActivationTokenInfoDependencies = {
  participantAuthRepository: ParticipantAuthRepository;
};

export class GetActivationTokenInfoUseCase extends UseCase<
  GetActivationTokenInfoInputDto,
  GetActivationTokenInfoOutputDto
> {
  private readonly repository: ParticipantAuthRepository;

  constructor(dependencies: GetActivationTokenInfoDependencies) {
    super();
    this.repository = dependencies.participantAuthRepository;
  }

  async execute(
    input: GetActivationTokenInfoInputDto,
  ): Promise<Result<GetActivationTokenInfoOutputDto>> {
    if (!input.rawToken || typeof input.rawToken !== "string") {
      return Result.fail(new Error("Token de ativação ausente."));
    }

    const tokenHash = hashToken(input.rawToken.trim());
    const token = await this.repository.findActivationToken(tokenHash);

    if (!token) {
      return Result.fail(
        new Error(
          "Link de cadastro inválido ou não encontrado. Solicite um novo link.",
        ),
      );
    }

    if (token.usedAt) {
      return Result.fail(
        new Error("Este link de cadastro já foi utilizado. Faça login com sua senha."),
      );
    }

    if (new Date() > token.expiresAt) {
      return Result.fail(
        new Error(
          "Este link de cadastro expirou. Solicite um novo link para continuar.",
        ),
      );
    }

    return Result.ok({
      email: token.email,
      cpf: token.cpf,
    });
  }
}

