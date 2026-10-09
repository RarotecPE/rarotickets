import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { ParticipantAuthRepository } from "@/modules/ticketing/domain/participants/repositories/participant-auth-repository.interface";
import {
  createParticipantSessionToken,
  verifyPassword,
} from "@/server/auth/participant-session.service";

export type ParticipantLoginWithPasswordInputDto = {
  identifier: string;
  password: string;
};

export type ParticipantLoginWithPasswordOutputDto = {
  participant: {
    id: string;
    name: string;
    email: string;
    cpf: string | null;
    phone: string;
  };
  sessionToken: string;
};

export type ParticipantLoginWithPasswordDependencies = {
  participantAuthRepository: ParticipantAuthRepository;
};

export class ParticipantLoginWithPasswordUseCase extends UseCase<
  ParticipantLoginWithPasswordInputDto,
  ParticipantLoginWithPasswordOutputDto
> {
  private readonly repository: ParticipantAuthRepository;

  constructor(dependencies: ParticipantLoginWithPasswordDependencies) {
    super();
    this.repository = dependencies.participantAuthRepository;
  }

  async execute(
    input: ParticipantLoginWithPasswordInputDto,
  ): Promise<Result<ParticipantLoginWithPasswordOutputDto>> {
    const rawIdentifier = input.identifier?.trim() || "";
    const rawPassword = input.password || "";

    if (!rawIdentifier || !rawPassword) {
      return Result.fail(new Error("Informe seu CPF ou e-mail e sua senha."));
    }

    const cleanCpfDigits = rawIdentifier.replace(/\D/g, "");
    let participant = await this.repository.findByEmail(rawIdentifier.toLowerCase());

    if (!participant && cleanCpfDigits.length === 11) {
      participant = await this.repository.findByCpf(cleanCpfDigits);
    }

    if (!participant || !participant.passwordHash) {
      return Result.fail(
        new Error(
          "E-mail/CPF ou senha incorretos. Se você ainda não cadastrou uma senha, solicite um link de cadastro ou acesse via código por e-mail.",
        ),
      );
    }

    const isPasswordValid = verifyPassword(rawPassword, participant.passwordHash);
    if (!isPasswordValid) {
      return Result.fail(new Error("E-mail/CPF ou senha incorretos."));
    }

    const sessionToken = createParticipantSessionToken({
      id: participant.id,
      name: participant.name,
      email: participant.email,
      cpf: participant.cpf,
      phone: participant.phone,
    });

    return Result.ok({
      participant: {
        id: participant.id,
        name: participant.name,
        email: participant.email,
        cpf: participant.cpf,
        phone: participant.phone,
      },
      sessionToken,
    });
  }
}

