import { describe, expect, it } from 'vitest';
import { Result } from '../../../../@core/domain/result';
import { Participant } from '../../domain/entities/participant.entity';
import { ParticipantAlreadyRegisteredError } from '../../domain/errors/participant-already-registered.error';
import type { IParticipantRepository } from '../../domain/repositories/participant-repository.interface';
import type { IParticipantPasswordHasher } from '../../domain/services/participant-password-hasher.interface';
import { ParticipantMapper } from '../mappers/participant.mapper';
import { LoginParticipantUseCase } from './login-participant/login-participant.use-case';
import { RegisterParticipantUseCase } from './register-participant/register-participant.use-case';

describe('participant authentication use cases', () => {
  it('registers a participant and authenticates by e-mail and password only', async () => {
    const dependencies = createParticipantAuthTestDependencies();
    const registerUseCase = new RegisterParticipantUseCase(dependencies);
    const loginUseCase = new LoginParticipantUseCase(dependencies);
    const registration = await registerUseCase.execute({
      name: 'Ana Silva',
      email: 'ANA@example.com',
      cpf: '529.982.247-25',
      password: 'senha-segura-123',
    });

    expect(registration.isSuccess).toBe(true);
    expect(registration.value.participant).toMatchObject({
      name: 'Ana Silva',
      email: 'ana@example.com',
      cpfMasked: '***.***.***-25',
    });
    await expect(loginUseCase.execute({ email: 'ana@example.com', password: 'senha-segura-123' }))
      .resolves.toMatchObject({ isSuccess: true });
    await expect(loginUseCase.execute({ email: 'ana@example.com', password: 'senha-incorreta-123' }))
      .resolves.toMatchObject({ isFailure: true, error: { code: 'INVALID_PARTICIPANT_CREDENTIALS' } });
  });

  it('rejects duplicate e-mail or CPF at the repository boundary', async () => {
    const dependencies = createParticipantAuthTestDependencies();
    const registerUseCase = new RegisterParticipantUseCase(dependencies);
    const firstRegistration = await registerUseCase.execute({
      name: 'Ana Silva',
      email: 'ana@example.com',
      cpf: '529.982.247-25',
      password: 'senha-segura-123',
    });
    const duplicateRegistration = await registerUseCase.execute({
      name: 'Ana Souza',
      email: 'outra@example.com',
      cpf: '529.982.247-25',
      password: 'senha-segura-456',
    });

    expect(firstRegistration.isSuccess).toBe(true);
    expect(duplicateRegistration.isFailure).toBe(true);
    expect(duplicateRegistration.error).toBeInstanceOf(ParticipantAlreadyRegisteredError);
  });
});

type ParticipantAuthTestDependencies = {
  participantRepository: IParticipantRepository;
  passwordHasher: IParticipantPasswordHasher;
  participantMapper: ParticipantMapper;
};
type FindParticipantByEmailTestParams = { participants: Participant[]; email: string };
type FindParticipantByCpfTestParams = { participants: Participant[]; cpf: string };

function createParticipantAuthTestDependencies(): ParticipantAuthTestDependencies {
  const participants: Participant[] = [];
  const participantRepository: IParticipantRepository = {
    findById: async (params) => participants.find((participant) => participant.id.toString() === params.participantId) ?? null,
    findByEmail: async (params) => findParticipantByEmail({ participants, email: params.email.value }),
    findByCpf: async (params) => findParticipantByCpf({ participants, cpf: params.cpf.value }),
    save: async (params) => {
      const duplicate = participants.some((participant) => (
        participant.id.equals(params.participant.id)
        || participant.email.value === params.participant.email.value
        || participant.cpf.value === params.participant.cpf.value
      ));
      if (duplicate) return Result.fail<void>(new ParticipantAlreadyRegisteredError());
      participants.push(params.participant);
      return Result.ok();
    },
  };
  const passwordHasher: IParticipantPasswordHasher = {
    hash: async (params) => `test-hash$${params.password}`,
    verify: async (params) => params.passwordHash === `test-hash$${params.password}`,
  };
  return { participantRepository, passwordHasher, participantMapper: new ParticipantMapper() };
}

function findParticipantByEmail(params: FindParticipantByEmailTestParams): Participant | null {
  return params.participants.find((participant) => participant.email.value === params.email) ?? null;
}

function findParticipantByCpf(params: FindParticipantByCpfTestParams): Participant | null {
  return params.participants.find((participant) => participant.cpf.value === params.cpf) ?? null;
}
