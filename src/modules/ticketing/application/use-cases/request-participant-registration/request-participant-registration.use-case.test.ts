import { describe, expect, it, vi } from "vitest";
import { RequestParticipantRegistrationUseCase } from "./request-participant-registration.use-case";
import type {
  ParticipantAuthRecord,
  ParticipantAuthRepository,
} from "@/modules/ticketing/domain/participants/repositories/participant-auth-repository.interface";
import type { IParticipantEmailSender } from "@/modules/ticketing/domain/services/participant-email-sender.interface";

describe("RequestParticipantRegistrationUseCase", () => {
  const mockRepository: ParticipantAuthRepository = {
    findByEmail: vi.fn(),
    findByCpf: vi.fn(),
    findById: vi.fn(),
    saveActivationToken: vi.fn(),
    findActivationToken: vi.fn(),
    saveOtpToken: vi.fn(),
    findActiveOtpToken: vi.fn(),
    markTokenUsed: vi.fn(),
    upsertActiveParticipant: vi.fn(),
    listParticipantEvents: vi.fn(),
  };

  const mockEmailSender: IParticipantEmailSender = {
    sendActivationEmail: vi.fn(),
    sendOtpEmail: vi.fn(),
  };

  const useCase = new RequestParticipantRegistrationUseCase({
    participantAuthRepository: mockRepository,
    emailSender: mockEmailSender,
    publicBaseUrl: "http://localhost:3000",
  });

  const mockParticipant: ParticipantAuthRecord = {
    id: "part-1",
    name: "Teste",
    email: "participante@teste.com",
    cpf: "52998224725",
    phone: "11999999999",
    birthDate: null,
    company: null,
    jobTitle: null,
    passwordHash: "hash-exists",
    status: "ativo",
    termsConsent: true,
    marketingConsent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should fail when CPF is invalid", async () => {
    const result = await useCase.execute({
      cpf: "123",
      email: "participante@teste.com",
    });

    expect(result.isFailure).toBe(true);
  });

  it("should fail when email is invalid", async () => {
    const result = await useCase.execute({
      cpf: "52998224725",
      email: "invalid-email",
    });

    expect(result.isFailure).toBe(true);
  });

  it("should fail if participant already has a password set", async () => {
    vi.mocked(mockRepository.findByEmail).mockResolvedValueOnce(mockParticipant);

    const result = await useCase.execute({
      cpf: "52998224725",
      email: "participante@teste.com",
    });

    expect(result.isFailure).toBe(true);
    expect(result.error?.message).toContain("já possui cadastro com senha ativa");
  });

  it("should generate token, save it and send activation email when valid", async () => {
    vi.mocked(mockRepository.findByEmail).mockResolvedValueOnce(null);
    vi.mocked(mockRepository.findByCpf).mockResolvedValueOnce(null);
    vi.mocked(mockRepository.saveActivationToken).mockResolvedValueOnce(undefined);
    vi.mocked(mockEmailSender.sendActivationEmail).mockResolvedValueOnce(undefined);

    const result = await useCase.execute({
      cpf: "52998224725",
      email: "participante@teste.com",
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.success).toBe(true);
    expect(mockRepository.saveActivationToken).toHaveBeenCalledTimes(1);
    expect(mockEmailSender.sendActivationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "participante@teste.com",
        activationUrl: expect.stringContaining("/participante/cadastro/completar?token="),
      }),
    );
  });
});

