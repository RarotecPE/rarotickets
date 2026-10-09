import { describe, expect, it, vi } from "vitest";
import { ParticipantLoginWithPasswordUseCase } from "./participant-login-with-password.use-case";
import type {
  ParticipantAuthRecord,
  ParticipantAuthRepository,
} from "@/modules/ticketing/domain/participants/repositories/participant-auth-repository.interface";
import { hashPassword } from "@/server/auth/participant-session.service";

describe("ParticipantLoginWithPasswordUseCase", () => {
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

  const useCase = new ParticipantLoginWithPasswordUseCase({
    participantAuthRepository: mockRepository,
  });

  const correctPassword = "MinhaSenha123";
  const passwordHash = hashPassword(correctPassword);

  const mockParticipant: ParticipantAuthRecord = {
    id: "part-1",
    name: "João Silva",
    email: "joao@teste.com",
    cpf: "52998224725",
    phone: "11987654321",
    birthDate: null,
    company: null,
    jobTitle: null,
    passwordHash,
    status: "ativo",
    termsConsent: true,
    marketingConsent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should fail when identifier or password is missing", async () => {
    const result = await useCase.execute({
      identifier: "",
      password: "",
    });

    expect(result.isFailure).toBe(true);
  });

  it("should fail when participant is not found", async () => {
    vi.mocked(mockRepository.findByEmail).mockResolvedValueOnce(null);

    const result = await useCase.execute({
      identifier: "naoexiste@teste.com",
      password: "123",
    });

    expect(result.isFailure).toBe(true);
    expect(result.error?.message).toContain("incorretos");
  });

  it("should fail when password does not match", async () => {
    vi.mocked(mockRepository.findByEmail).mockResolvedValueOnce(mockParticipant);

    const result = await useCase.execute({
      identifier: "joao@teste.com",
      password: "SenhaErrada",
    });

    expect(result.isFailure).toBe(true);
    expect(result.error?.message).toContain("incorretos");
  });

  it("should succeed and return participant info with session token when credentials match", async () => {
    vi.mocked(mockRepository.findByEmail).mockResolvedValueOnce(mockParticipant);

    const result = await useCase.execute({
      identifier: "joao@teste.com",
      password: correctPassword,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.participant.email).toBe("joao@teste.com");
    expect(result.value.sessionToken).toBeDefined();
  });
});

