import { UseCase } from '../../../../../@core/application/use-case.base';
import { Result } from '../../../../../@core/domain/result';
import { Participant } from '../../../domain/entities/participant.entity';
import type { IParticipantRepository } from '../../../domain/repositories/participant-repository.interface';
import type { IParticipantPasswordHasher } from '../../../domain/services/participant-password-hasher.interface';
import { ParticipantCpf } from '../../../domain/value-objects/participant-cpf.vo';
import { ParticipantEmail } from '../../../domain/value-objects/participant-email.vo';
import { ParticipantName } from '../../../domain/value-objects/participant-name.vo';
import { ParticipantPassword } from '../../../domain/value-objects/participant-password.vo';
import { ParticipantMapper } from '../../mappers/participant.mapper';
import type { RegisterParticipantInputDto } from './register-participant.input.dto';
import type { RegisterParticipantOutputDto } from './register-participant.output.dto';

export type RegisterParticipantDependencies = {
  participantRepository: IParticipantRepository;
  passwordHasher: IParticipantPasswordHasher;
  participantMapper: ParticipantMapper;
};

export class RegisterParticipantUseCase extends UseCase<RegisterParticipantInputDto, RegisterParticipantOutputDto> {
  private readonly participantRepository: IParticipantRepository;
  private readonly passwordHasher: IParticipantPasswordHasher;
  private readonly participantMapper: ParticipantMapper;

  constructor(dependencies: RegisterParticipantDependencies) {
    super();
    this.participantRepository = dependencies.participantRepository;
    this.passwordHasher = dependencies.passwordHasher;
    this.participantMapper = dependencies.participantMapper;
  }

  async execute(input: RegisterParticipantInputDto): Promise<Result<RegisterParticipantOutputDto>> {
    const nameResult = ParticipantName.create(input.name);
    if (nameResult.isFailure) return Result.fail(nameResult.error);
    const emailResult = ParticipantEmail.create(input.email);
    if (emailResult.isFailure) return Result.fail(emailResult.error);
    const cpfResult = ParticipantCpf.create(input.cpf);
    if (cpfResult.isFailure) return Result.fail(cpfResult.error);
    const passwordResult = ParticipantPassword.create(input.password);
    if (passwordResult.isFailure) return Result.fail(passwordResult.error);

    const passwordHash = await this.passwordHasher.hash({ password: passwordResult.value.value });
    const participantResult = Participant.create({
      name: nameResult.value.value,
      email: emailResult.value.value,
      cpf: cpfResult.value.value,
      passwordHash,
    });
    if (participantResult.isFailure) return Result.fail(participantResult.error);

    const saveResult = await this.participantRepository.save({ participant: participantResult.value });
    if (saveResult.isFailure) return Result.fail(saveResult.error);
    return Result.ok({ participant: this.participantMapper.map({ participant: participantResult.value }) });
  }
}
