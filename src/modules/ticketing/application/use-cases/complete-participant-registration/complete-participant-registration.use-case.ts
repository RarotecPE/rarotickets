import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import { ParticipantName } from "@/modules/ticketing/domain/participants/value-objects/participant-name.vo";
import { Phone } from "@/modules/ticketing/domain/participants/value-objects/phone.vo";
import { ParticipantPassword } from "@/modules/ticketing/domain/participants/value-objects/participant-password.vo";
import type {
  ParticipantAuthRecord,
  ParticipantAuthRepository,
} from "@/modules/ticketing/domain/participants/repositories/participant-auth-repository.interface";
import {
  createParticipantSessionToken,
  hashPassword,
  hashToken,
} from "@/server/auth/participant-session.service";

export type CompleteParticipantRegistrationInputDto = {
  rawToken: string;
  name: string;
  phone: string;
  birthDate?: string | Date | null;
  company?: string | null;
  jobTitle?: string | null;
  password: string;
  termsConsent: boolean;
  marketingConsent?: boolean;
};

export type CompleteParticipantRegistrationOutputDto = {
  participant: {
    id: string;
    name: string;
    email: string;
    cpf: string | null;
    phone: string;
  };
  sessionToken: string;
};

export type CompleteParticipantRegistrationDependencies = {
  participantAuthRepository: ParticipantAuthRepository;
};

export class CompleteParticipantRegistrationUseCase extends UseCase<
  CompleteParticipantRegistrationInputDto,
  CompleteParticipantRegistrationOutputDto
> {
  private readonly repository: ParticipantAuthRepository;

  constructor(dependencies: CompleteParticipantRegistrationDependencies) {
    super();
    this.repository = dependencies.participantAuthRepository;
  }

  async execute(
    input: CompleteParticipantRegistrationInputDto,
  ): Promise<Result<CompleteParticipantRegistrationOutputDto>> {
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

    const nameResult = ParticipantName.create(input.name);
    if (nameResult.isFailure) return Result.fail(nameResult.error);

    const phoneResult = Phone.create(input.phone);
    if (phoneResult.isFailure) return Result.fail(phoneResult.error);

    const passwordResult = ParticipantPassword.create(input.password);
    if (passwordResult.isFailure) return Result.fail(passwordResult.error);

    if (!input.termsConsent) {
      return Result.fail(
        new Error("Você precisa aceitar os termos de uso e privacidade para continuar."),
      );
    }

    const passwordHash = hashPassword(passwordResult.value.value);
    const birthDate = input.birthDate ? new Date(input.birthDate) : null;

    let savedParticipant: ParticipantAuthRecord;
    try {
      savedParticipant = await this.repository.upsertActiveParticipant({
        name: nameResult.value.value,
        email: token.email,
        cpf: token.cpf ?? "",
        phone: phoneResult.value.digits,
        birthDate: birthDate && !Number.isNaN(birthDate.getTime()) ? birthDate : null,
        company: input.company?.trim() || null,
        jobTitle: input.jobTitle?.trim() || null,
        passwordHash,
        termsConsent: true,
        marketingConsent: Boolean(input.marketingConsent),
      });
    } catch (caught) {
      return Result.fail(
        caught instanceof Error
          ? caught
          : new Error("Não foi possível salvar o cadastro."),
      );
    }

    await this.repository.markTokenUsed(token.id);

    const sessionToken = createParticipantSessionToken({
      id: savedParticipant.id,
      name: savedParticipant.name,
      email: savedParticipant.email,
      cpf: savedParticipant.cpf,
      phone: savedParticipant.phone,
    });

    return Result.ok({
      participant: {
        id: savedParticipant.id,
        name: savedParticipant.name,
        email: savedParticipant.email,
        cpf: savedParticipant.cpf,
        phone: savedParticipant.phone,
      },
      sessionToken,
    });
  }
}

