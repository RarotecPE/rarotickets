import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { ParticipantAuthRepository } from "@/modules/ticketing/domain/participants/repositories/participant-auth-repository.interface";
import { createParticipantSessionToken } from "@/server/auth/participant-session.service";

export type VerifyParticipantOtpInputDto = {
  identifier: string;
  code: string;
};

export type VerifyParticipantOtpOutputDto = {
  participant: {
    id: string;
    name: string;
    email: string;
    cpf: string | null;
    phone: string;
  };
  sessionToken: string;
};

export type VerifyParticipantOtpDependencies = {
  participantAuthRepository: ParticipantAuthRepository;
};

export class VerifyParticipantOtpUseCase extends UseCase<
  VerifyParticipantOtpInputDto,
  VerifyParticipantOtpOutputDto
> {
  private readonly repository: ParticipantAuthRepository;

  constructor(dependencies: VerifyParticipantOtpDependencies) {
    super();
    this.repository = dependencies.participantAuthRepository;
  }

  async execute(
    input: VerifyParticipantOtpInputDto,
  ): Promise<Result<VerifyParticipantOtpOutputDto>> {
    const rawIdentifier = input.identifier?.trim() || "";
    const rawCode = input.code?.trim() || "";

    if (!rawIdentifier || !rawCode) {
      return Result.fail(new Error("Informe seu e-mail ou CPF e o código recebido."));
    }

    const cleanCpfDigits = rawIdentifier.replace(/\D/g, "");
    let participant = await this.repository.findByEmail(rawIdentifier.toLowerCase());

    if (!participant && cleanCpfDigits.length === 11) {
      participant = await this.repository.findByCpf(cleanCpfDigits);
    }

    if (!participant) {
      return Result.fail(new Error("Participante não encontrado. Cadastre-se para continuar."));
    }

    const otpToken = await this.repository.findActiveOtpToken({
      email: participant.email,
      code: rawCode,
    });

    if (!otpToken) {
      return Result.fail(
        new Error(
          "Código de confirmação incorreto ou expirado. Verifique o código ou solicite um novo envio.",
        ),
      );
    }

    await this.repository.markTokenUsed(otpToken.id);

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

