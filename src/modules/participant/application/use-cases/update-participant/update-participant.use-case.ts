import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { Result } from '@core/domain/result';
import { onlyDigits } from '@core/domain/validators/document.validator';
import { ParticipantDuplicatedError } from '../../../domain/errors/participant-duplicated.error';
import { ParticipantNotFoundError } from '../../../domain/errors/participant-not-found.error';
import { PARTICIPANT_REPOSITORY } from '../../../domain/repositories/participant-repository.interface';
import type { IParticipantRepository } from '../../../domain/repositories/participant-repository.interface';
import { ParticipantMapper } from '../../mappers/participant.mapper';
import type { UpdateParticipantInputDto } from './update-participant.input.dto';
import type { UpdateParticipantOutputDto } from './update-participant.output.dto';

export type UpdateParticipantDependencies = {
  participantRepository: IParticipantRepository;
  auditRecorder: IAuditRecorder;
  mapper: ParticipantMapper;
};

export class UpdateParticipantUseCase extends UseCase<UpdateParticipantInputDto, UpdateParticipantOutputDto> {
  private readonly participantRepository: IParticipantRepository;
  private readonly auditRecorder: IAuditRecorder;
  private readonly mapper: ParticipantMapper;

  constructor(dependencies: UpdateParticipantDependencies) {
    super();
    this.participantRepository = dependencies.participantRepository;
    this.auditRecorder = dependencies.auditRecorder;
    this.mapper = dependencies.mapper;
  }

  async execute(input: UpdateParticipantInputDto): Promise<Result<UpdateParticipantOutputDto>> {
    const participant = await this.participantRepository.findById(input.participantId);
    if (!participant) return Result.fail(new ParticipantNotFoundError({ participantId: input.participantId }));

    const cpf = input.cpf ? onlyDigits(input.cpf) : null;
    if (cpf) {
      const owner = await this.participantRepository.findByCpf(cpf);
      if (owner && owner.id.toString() !== input.participantId) {
        return Result.fail(new ParticipantDuplicatedError({ field: 'CPF', value: cpf }));
      }
    }

    const emailOwner = await this.participantRepository.findByEmail(input.email);
    if (emailOwner && emailOwner.id.toString() !== input.participantId) {
      return Result.fail(new ParticipantDuplicatedError({ field: 'E-MAIL', value: input.email }));
    }

    const before = {
      name: participant.name.value,
      email: participant.email.value,
      phone: participant.phone?.value ?? null,
      city: participant.city?.value ?? null,
      state: participant.state?.value ?? null,
      company: participant.company?.value ?? null,
      jobTitle: participant.jobTitle?.value ?? null,
    };

    const updateResult = participant.updateProfile({
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
    });
    if (updateResult.isFailure) return Result.fail(updateResult.error);

    await this.participantRepository.update(participant);

    await this.auditRecorder.record({
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      action: 'PARTICIPANT_UPDATED',
      entity: 'participant',
      entityId: participant.id.toString(),
      description: `Cadastro do participante ${participant.name.value} atualizado`,
      before,
      after: {
        name: participant.name.value,
        email: participant.email.value,
        phone: participant.phone?.value ?? null,
        city: participant.city?.value ?? null,
        state: participant.state?.value ?? null,
        company: participant.company?.value ?? null,
        jobTitle: participant.jobTitle?.value ?? null,
      },
      ip: input.ip ?? null,
    });

    return Result.ok({ participant: this.mapper.map({ participant }) });
  }
}
