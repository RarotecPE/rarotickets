import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { ParticipantAuthRepository } from "@/modules/ticketing/domain/participants/repositories/participant-auth-repository.interface";
import type { IParticipantEmailSender } from "@/modules/ticketing/domain/services/participant-email-sender.interface";
import {
  generateOtpCode,
  hashToken,
} from "@/server/auth/participant-session.service";

export type RequestParticipantOtpInputDto = {
  identifier: string;
};

export type RequestParticipantOtpOutputDto = {
  success: boolean;
  emailMasked: string;
  message: string;
};

export type RequestParticipantOtpDependencies = {
  participantAuthRepository: ParticipantAuthRepository;
  emailSender: IParticipantEmailSender;
};

export class RequestParticipantOtpUseCase extends UseCase<
  RequestParticipantOtpInputDto,
  RequestParticipantOtpOutputDto
> {
  private readonly repository: ParticipantAuthRepository;
  private readonly emailSender: IParticipantEmailSender;

  constructor(dependencies: RequestParticipantOtpDependencies) {
    super();
    this.repository = dependencies.participantAuthRepository;
    this.emailSender = dependencies.emailSender;
  }

  async execute(
    input: RequestParticipantOtpInputDto,
  ): Promise<Result<RequestParticipantOtpOutputDto>> {
    const rawIdentifier = input.identifier?.trim() || "";
    if (!rawIdentifier) {
      return Result.fail(new Error("Informe seu CPF ou e-mail."));
    }

    const cleanCpfDigits = rawIdentifier.replace(/\D/g, "");

    const participant = rawIdentifier.includes("@") 
                        ? await this.repository.findByEmail(rawIdentifier.toLowerCase()) 
                        : await this.repository.findByCpf(cleanCpfDigits);
    
    if (!participant) {
      return Result.fail(
        new Error(
          "Nenhum participante encontrado com este CPF ou e-mail. Cadastre-se para continuar.",
        ),
      );
    }

    const code = generateOtpCode();
    const tokenHash = hashToken(`${code}:${participant.email}`);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await this.repository.saveOtpToken({
      email: participant.email,
      cpf: participant.cpf,
      code,
      tokenHash,
      expiresAt,
      participantId: participant.id,
    });

    await this.emailSender.sendOtpEmail({
      email: participant.email,
      code,
    });

    const emailMasked = maskEmail(participant.email);

    return Result.ok({
      success: true,
      emailMasked,
      message: `Enviamos um código de confirmação de 6 dígitos para ${emailMasked}.`,
    });
  }
}

function maskEmail(email: string): string {
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const [name, domain] = parts;
  if (!name || !domain) return email;
  const visibleLen = Math.min(2, name.length);
  const maskedName = name.slice(0, visibleLen) + "*".repeat(Math.max(2, name.length - visibleLen));
  return `${maskedName}@${domain}`;
}

