import { describe, expect, it, vi } from "vitest";
import { VerifyParticipantOtpUseCase } from "./verify-participant-otp.use-case";
import type {
  ParticipantAuthRecord,
  ParticipantAuthRepository,
} from "@/modules/ticketing/domain/participants/repositories/participant-auth-repository.interface";

describe("VerifyParticipantOtpUseCase", () => {
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

  const useCase = new VerifyParticipantOtpUseCase({
    participantAuthRepository: mockRepository,
  });

  const mockParticipant: ParticipantAuthRecord = {
    id: "part-1",
    name: "João Silva",
    email: "joao@teste.com",
    cpf: "52998224725",
    phone: "11987654321",
    birthDate: null,
    company: null,
    jobTitle: null,
    passwordHash: null,
    status: "ativo",
    termsConsent: true,
    marketingConsent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should fail when code or identifier is missing", async () => {
    const result = await useCase.execute({
      identifier: "",
      code: "",
    });

    expect(result.isFailure).toBe(true);
  });

  it("should fail when participant does not exist", async () => {
    vi.mocked(mockRepository.findByEmail).mockResolvedValueOnce(null);

    const result = await useCase.execute({
      identifier: "desconhecido@teste.com",
      code: "123456",
    });

    expect(result.isFailure).toBe(true);
    expect(result.error?.message).toContain("não encontrado");
  });

  it("should fail when otp code is incorrect or expired", async () => {
    vi.mocked(mockRepository.findByEmail).mockResolvedValueOnce(mockParticipant);
    vi.mocked(mockRepository.findActiveOtpToken).mockResolvedValueOnce(null);

    const result = await useCase.execute({
      identifier: "joao@teste.com",
      code: "000000",
    });

    expect(result.isFailure).toBe(true);
    expect(result.error?.message).toContain("incorreto ou expirado");
  });

  it("should succeed and mark token as used when code is valid", async () => {
    vi.mocked(mockRepository.findByEmail).mockResolvedValueOnce(mockParticipant);

    vi.mocked(mockRepository.findActiveOtpToken).mockResolvedValueOnce({
      id: "otp-1",
      email: "joao@teste.com",
      cpf: "52998224725",
      tokenHash: "token-hash",
      code: "123456",
      expiresAt: new Date(Date.now() + 60000),
      usedAt: null,
    });

    vi.mocked(mockRepository.markTokenUsed).mockResolvedValueOnce(undefined);

    const result = await useCase.execute({
      identifier: "joao@teste.com",
      code: "123456",
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.participant.id).toBe("part-1");
    expect(result.value.sessionToken).toBeDefined();
    expect(mockRepository.markTokenUsed).toHaveBeenCalledWith("otp-1");
  });
});

