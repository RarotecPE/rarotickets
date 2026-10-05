import type {
  CreateParticipantFromRegistrationParams,
  FindParticipantParams,
  IParticipantGateway,
  ParticipantGatewayResult,
  ParticipantSnapshot,
} from '@core/contracts/participant-gateway.contract';
import type { Participant } from '../../../domain/entities/participant.entity';
import type { ResolveParticipantUseCase } from '../../../application/use-cases/resolve-participant/resolve-participant.use-case';
import type { ParticipantRepository } from '../../../domain/repositories/participant-repository.base';

export type ParticipantGatewayDependencies = {
  resolveParticipantUseCase: ResolveParticipantUseCase;
  participantRepository: ParticipantRepository;
};

/**
 * Adaptador (ACL) que expõe o contexto de participantes para o fluxo de
 * inscrições sem que os módulos se importem diretamente.
 */
export class ParticipantGatewayAdapter implements IParticipantGateway {
  private readonly dependencies: ParticipantGatewayDependencies;

  constructor(dependencies: ParticipantGatewayDependencies) {
    this.dependencies = dependencies;
  }

  async findByDocumentOrEmail(params: FindParticipantParams): Promise<ParticipantSnapshot | null> {
    if (params.cpf) {
      const byCpf = await this.dependencies.participantRepository.findByCpf(params.cpf);
      if (byCpf) return toSnapshot(byCpf);
    }
    if (params.email) {
      const byEmail = await this.dependencies.participantRepository.findByEmail(params.email);
      if (byEmail) return toSnapshot(byEmail);
    }
    return null;
  }

  async findById(params: { id: string }): Promise<ParticipantSnapshot | null> {
    const participant = await this.dependencies.participantRepository.findById(params.id);
    return participant ? toSnapshot(participant) : null;
  }

  async resolveForRegistration(
    params: CreateParticipantFromRegistrationParams,
  ): Promise<ParticipantGatewayResult> {
    const result = await this.dependencies.resolveParticipantUseCase.execute({
      name: params.name,
      email: params.email,
      cpf: params.cpf ?? null,
      cnpj: params.cnpj ?? null,
      phone: params.phone ?? null,
      birthDate: params.birthDate ?? null,
      company: params.company ?? null,
      jobTitle: params.jobTitle ?? null,
      city: params.city ?? null,
      state: params.state ?? null,
      consents: params.consent
        ? [
            {
              type: 'TERMOS_DE_USO',
              version: params.consent.termsVersion,
              accepted: true,
            },
            {
              type: 'POLITICA_DE_PRIVACIDADE',
              version: params.consent.privacyVersion,
              accepted: true,
            },
            {
              type: 'COMUNICACAO_MARKETING',
              version: params.consent.termsVersion,
              accepted: params.consent.marketingAccepted,
            },
          ]
        : [],
      ip: params.consent?.ip ?? null,
    });

    if (result.isFailure) return { status: 'INVALID', message: result.error.message };

    const snapshot = await this.findById({ id: result.value.participant.id });
    if (!snapshot) return { status: 'INVALID', message: 'Não foi possível carregar o participante' };

    return result.value.status === 'CREATED'
      ? { status: 'CREATED', participant: snapshot }
      : { status: 'FOUND', participant: snapshot };
  }
}

function toSnapshot(participant: Participant): ParticipantSnapshot {
  return {
    id: participant.id.toString(),
    name: participant.name.value,
    email: participant.email.value,
    cpf: participant.cpf?.value ?? null,
    cnpj: participant.cnpj?.value ?? null,
    phone: participant.phone?.value ?? null,
    birthDate: participant.birthDate ? participant.birthDate.value.toISOString().slice(0, 10) : null,
    company: participant.company?.value ?? null,
    jobTitle: participant.jobTitle?.value ?? null,
    city: participant.city?.value ?? null,
    state: participant.state?.value ?? null,
    createdAt: participant.createdAt,
  };
}
