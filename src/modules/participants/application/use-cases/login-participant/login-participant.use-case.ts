import { UseCase } from '../../../../../@core/application/use-case.base';
import { Result } from '../../../../../@core/domain/result';
import { InvalidParticipantCredentialsError } from '../../../domain/errors/invalid-participant-credentials.error';
import type { IParticipantRepository } from '../../../domain/repositories/participant-repository.interface';
import type { IParticipantPasswordHasher } from '../../../domain/services/participant-password-hasher.interface';
import { ParticipantEmail } from '../../../domain/value-objects/participant-email.vo';
import { ParticipantPassword } from '../../../domain/value-objects/participant-password.vo';
import { ParticipantMapper } from '../../mappers/participant.mapper';
import type { LoginParticipantInputDto } from './login-participant.input.dto';
import type { LoginParticipantOutputDto } from './login-participant.output.dto';

export type LoginParticipantDependencies = {
  participantRepository: IParticipantRepository;
  passwordHasher: IParticipantPasswordHasher;
  participantMapper: ParticipantMapper;
};

export class LoginParticipantUseCase extends UseCase<LoginParticipantInputDto, LoginParticipantOutputDto> {
  private readonly participantRepository: IParticipantRepository;
  private readonly passwordHasher: IParticipantPasswordHasher;
  private readonly participantMapper: ParticipantMapper;

  constructor(dependencies: LoginParticipantDependencies) {
    super();
    this.participantRepository = dependencies.participantRepository;
    this.passwordHasher = dependencies.passwordHasher;
    this.participantMapper = dependencies.participantMapper;
  }

  async execute(input: LoginParticipantInputDto): Promise<Result<LoginParticipantOutputDto>> {
    const emailResult = ParticipantEmail.create(input.email);
    const passwordResult = ParticipantPassword.create(input.password);
    if (emailResult.isFailure || passwordResult.isFailure) {
      return Result.fail(new InvalidParticipantCredentialsError());
    }

    const participant = await this.participantRepository.findByEmail({ email: emailResult.value });
    const passwordHash = participant?.passwordHash ?? '';
    const passwordMatches = await this.passwordHasher.verify({
      password: passwordResult.value.value,
      passwordHash,
    });
    if (!participant || !passwordMatches) return Result.fail(new InvalidParticipantCredentialsError());

    return Result.ok({ participant: this.participantMapper.map({ participant }) });
  }
}
