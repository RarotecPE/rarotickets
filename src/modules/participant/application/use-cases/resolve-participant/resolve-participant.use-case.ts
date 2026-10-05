import { UseCase } from '@core/application/use-case.base';
import { Result } from '@core/domain/result';
import { onlyDigits } from '@core/domain/validators/document.validator';
import { Participant } from '../../../domain/entities/participant.entity';
import { ParticipantConsent } from '../../../domain/entities/participant-consent.entity';
import { ParticipantDuplicatedError } from '../../../domain/errors/participant-duplicated.error';
import { PARTICIPANT_CONSENT_REPOSITORY } from '../../../domain/repositories/participant-consent-repository.interface';
import type { IParticipantConsentRepository } from '../../../domain/repositories/participant-consent-repository.interface';
import { PARTICIPANT_REPOSITORY } from '../../../domain/repositories/participant-repository.interface';
import type { IParticipantRepository } from '../../../domain/repositories/participant-repository.interface';
import { ParticipantMapper } from '../../mappers/participant.mapper';
import type { ResolveParticipantInputDto } from './resolve-participant.input.dto';
import type { ResolveParticipantOutputDto } from './resolve-participant.output.dto';

export type ResolveParticipantDependencies = {
  participantRepository: IParticipantRepository;
  consentRepository: IParticipantConsentRepository;
  mapper: ParticipantMapper;
};

/**
 * Resolve o cadastro principal do participante a partir do CPF/e-mail,
 * criando-o quando não existir e completando dados ausentes (§6 e §41).
 */
export class ResolveParticipantUseCase extends UseCase<ResolveParticipantInputDto, ResolveParticipantOutputDto> {
  private readonly participantRepository: IParticipantRepository;
  private readonly consentRepository: IParticipantConsentRepository;
  private readonly mapper: ParticipantMapper;

  constructor(dependencies: ResolveParticipantDependencies) {
    super();
    this.participantRepository = dependencies.participantRepository;
    this.consentRepository = dependencies.consentRepository;
    this.mapper = dependencies.mapper;
  }

  async execute(input: ResolveParticipantInputDto): Promise<Result<ResolveParticipantOutputDto>> {
    const cpf = input.cpf ? onlyDigits(input.cpf) : null;
    const email = (input.email ?? '').trim().toLowerCase();

    const byCpf = cpf ? await this.participantRepository.findByCpf(cpf) : null;
    const byEmail = await this.participantRepository.findByEmail(email);

    if (byCpf && byEmail && byCpf.id.toString() !== byEmail.id.toString()) {
      return Result.fail(new ParticipantDuplicatedError({ field: 'CPF', value: cpf ?? '' }));
    }

    const existing = byCpf ?? byEmail;
    const profileInput = {
      name: input.name,
      email: input.email,
      cpf,
      cnpj: input.cnpj ?? null,
      phone: input.phone ?? null,
      birthDate: input.birthDate ?? null,
      company: input.company ?? null,
      jobTitle: input.jobTitle ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
    };

    if (!existing) {
      const participantResult = Participant.create(profileInput);
      if (participantResult.isFailure) return Result.fail(participantResult.error);

      const participant = participantResult.value;
      await this.participantRepository.save(participant);
      await this.recordConsents(participant.id.toString(), input);
      return Result.ok({ status: 'CREATED', participant: await this.toDto(participant) });
    }

    const updateResult = existing.updateProfile({
      ...profileInput,
      email: input.email || existing.email.value,
      name: input.name || existing.name.value,
      cpf: cpf ?? existing.cpf?.value ?? null,
    });
    if (updateResult.isFailure) return Result.fail(updateResult.error);

    await this.participantRepository.update(existing);
    await this.recordConsents(existing.id.toString(), input);
    return Result.ok({ status: 'UPDATED', participant: await this.toDto(existing) });
  }

  private async recordConsents(participantId: string, input: ResolveParticipantInputDto): Promise<void> {
    for (const consent of input.consents ?? []) {
      const existing = await this.consentRepository.findByTypeAndVersion({
        participantId,
        type: consent.type,
        version: consent.version,
      });
      if (existing) continue;

      const consentResult = ParticipantConsent.create({
        participantId,
        type: consent.type,
        version: consent.version,
        accepted: consent.accepted,
        acceptedAt: consent.accepted ? new Date() : null,
        ip: input.ip ?? null,
      });
      if (consentResult.isFailure) continue;
      await this.consentRepository.save(consentResult.value);
    }
  }

  private async toDto(participant: Participant) {
    const consents = await this.consentRepository.listByParticipant(participant.id.toString());
    return this.mapper.map({ participant, consents });
  }
}
