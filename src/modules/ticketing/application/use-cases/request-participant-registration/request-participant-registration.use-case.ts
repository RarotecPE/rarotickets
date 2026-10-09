import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import { Cpf } from "@/modules/ticketing/domain/participants/value-objects/cpf.vo";
import { Email } from "@/modules/ticketing/domain/participants/value-objects/email.vo";
import type { ParticipantAuthRepository } from "@/modules/ticketing/domain/participants/repositories/participant-auth-repository.interface";
import type { IParticipantEmailSender } from "@/modules/ticketing/domain/services/participant-email-sender.interface";
import { generateRawToken, hashToken } from "@/server/auth/participant-session.service";

export type RequestParticipantRegistrationInputDto = {
  cpf: string;
  email: string;
  clientOrigin?: string;
  redirect?: string;
};

export type RequestParticipantRegistrationOutputDto = {
  success: boolean;
  message: string;
  email: string;
};

export type RequestParticipantRegistrationDependencies = {
  participantAuthRepository: ParticipantAuthRepository;
  emailSender: IParticipantEmailSender;
  publicBaseUrl: string;
};

export class RequestParticipantRegistrationUseCase extends UseCase<
  RequestParticipantRegistrationInputDto,
  RequestParticipantRegistrationOutputDto
> {
  private readonly repository: ParticipantAuthRepository;
  private readonly emailSender: IParticipantEmailSender;
  private readonly publicBaseUrl: string;

  constructor(dependencies: RequestParticipantRegistrationDependencies) {
    super();
    this.repository = dependencies.participantAuthRepository;
    this.emailSender = dependencies.emailSender;
    this.publicBaseUrl = dependencies.publicBaseUrl.replace(/\/$/, "");
  }

  async execute(
    input: RequestParticipantRegistrationInputDto,
  ): Promise<Result<RequestParticipantRegistrationOutputDto>> {
    const cpfResult = Cpf.create(input.cpf);
    if (cpfResult.isFailure) return Result.fail(cpfResult.error);

    const emailResult = Email.create(input.email);
    if (emailResult.isFailure) return Result.fail(emailResult.error);

    const email = emailResult.value.value;
    const cpf = cpfResult.value.digits;

    const existingByEmail = await this.repository.findByEmail(email);
    if (existingByEmail?.passwordHash) {
      return Result.fail(
        new Error(
          "Este e-mail já possui cadastro com senha ativa. Acesse a tela de login para entrar.",
        ),
      );
    }

    const existingByCpf = await this.repository.findByCpf(cpf);
    if (existingByCpf?.passwordHash) {
      return Result.fail(
        new Error(
          "Este CPF já possui cadastro com senha ativa. Acesse a tela de login para entrar.",
        ),
      );
    }

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    await this.repository.saveActivationToken({
      email,
      cpf,
      tokenHash,
      expiresAt,
    });

    const baseUrl = input.clientOrigin?.trim().replace(/\/$/, "") || this.publicBaseUrl;
    const redirectParam = input.redirect ? `&redirect=${encodeURIComponent(input.redirect)}` : "";
    const activationUrl = `${baseUrl}/participante/cadastro/completar?token=${encodeURIComponent(rawToken)}${redirectParam}`;

    await this.emailSender.sendActivationEmail({
      email,
      activationUrl,
    });

    return Result.ok({
      success: true,
      message: `Enviamos um link para o e-mail ${email}. Acesse seu e-mail para definir sua senha e concluir seu cadastro.`,
      email,
    });
  }
}

