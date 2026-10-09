import { describe, expect, it, vi } from "vitest";
import { CompleteParticipantRegistrationUseCase } from "./complete-participant-registration.use-case";
import type {
  ParticipantAuthRecord,
  ParticipantAuthRepository,
} from "@/modules/ticketing/domain/participants/repositories/participant-auth-repository.interface";
import { hashToken } from "@/server/auth/participant-session.service";

describe("CompleteParticipantRegistrationUseCase", () => {
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

  const useCase = new CompleteParticipantRegistrationUseCase({
    participantAuthRepository: mockRepository,
  });

  const validToken = "valid-raw-token";
  const validHash = hashToken(validToken);

  const mockParticipant: ParticipantAuthRecord = {
    id: "part-123",
    name: "João Silva",
    email: "joao@teste.com",
    cpf: "52998224725",
    phone: "11987654321",
    birthDate: null,
    company: null,
    jobTitle: null,
    passwordHash: "hashed-pw",
    status: "ativo",
    termsConsent: true,
    marketingConsent: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should fail when token is invalid or not found", async () => {
    vi.mocked(mockRepository.findActivationToken).mockResolvedValueOnce(null);

    const result = await useCase.execute({
      rawToken: validToken,
      name: "João Silva",
      phone: "11987654321",
      password: "SenhaSegura123",
      termsConsent: true,
    });

    expect(result.isFailure).toBe(true);
    expect(result.error?.message).toContain("não encontrado");
  });

  it("should fail when token has expired", async () => {
    vi.mocked(mockRepository.findActivationToken).mockResolvedValueOnce({
      id: "tok-1",
      email: "joao@teste.com",
      cpf: "52998224725",
      tokenHash: validHash,
      expiresAt: new Date(Date.now() - 10000), // expired
      usedAt: null,
    });

    const result = await useCase.execute({
      rawToken: validToken,
      name: "João Silva",
      phone: "11987654321",
      password: "SenhaSegura123",
      termsConsent: true,
    });

    expect(result.isFailure).toBe(true);
    expect(result.error?.message).toContain("expirou");
  });

  it("should fail when terms are not accepted", async () => {
    vi.mocked(mockRepository.findActivationToken).mockResolvedValueOnce({
      id: "tok-1",
      email: "joao@teste.com",
      cpf: "52998224725",
      tokenHash: validHash,
      expiresAt: new Date(Date.now() + 60000),
      usedAt: null,
    });

    const result = await useCase.execute({
      rawToken: validToken,
      name: "João Silva",
      phone: "11987654321",
      password: "SenhaSegura123",
      termsConsent: false,
    });

    expect(result.isFailure).toBe(true);
    expect(result.error?.message).toContain("aceitar os termos");
  });

  it("should successfully register participant, mark token used and return session token", async () => {
    vi.mocked(mockRepository.findActivationToken).mockResolvedValueOnce({
      id: "tok-1",
      email: "joao@teste.com",
      cpf: "52998224725",
      tokenHash: validHash,
      expiresAt: new Date(Date.now() + 60000),
      usedAt: null,
    });

    vi.mocked(mockRepository.upsertActiveParticipant).mockResolvedValueOnce(mockParticipant);
    vi.mocked(mockRepository.markTokenUsed).mockResolvedValueOnce(undefined);

    const result = await useCase.execute({
      rawToken: validToken,
      name: "João Silva",
      phone: "11987654321",
      password: "SenhaSegura123",
      termsConsent: true,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value.participant.id).toBe("part-123");
    expect(result.value.sessionToken).toBeDefined();
    expect(mockRepository.markTokenUsed).toHaveBeenCalledWith("tok-1");
  });
});

