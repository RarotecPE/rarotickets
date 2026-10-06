import { Entity } from '../../../../@core/domain/entity.base';
import type { EntityConstructorParams } from '../../../../@core/domain/entity.base';
import { Result } from '../../../../@core/domain/result';
import { InvalidParticipantNameError } from '../errors/invalid-participant-name.error';
import { ParticipantEmail } from '../value-objects/participant-email.vo';
import { ParticipantName } from '../value-objects/participant-name.vo';
import { ParticipantCpf } from '../value-objects/participant-cpf.vo';

export type ParticipantPasswordHash = string;
export type ParticipantProps = {
  name: ParticipantName;
  email: ParticipantEmail;
  cpf: ParticipantCpf;
  passwordHash: ParticipantPasswordHash;
};
export type ParticipantConstructorParams = EntityConstructorParams<ParticipantProps>;
export type CreateParticipantParams = {
  name: string;
  email: string;
  cpf: string;
  passwordHash: ParticipantPasswordHash;
};
export type ReconstituteParticipantParams = ParticipantConstructorParams;
export type ChangeParticipantNameParams = { name: string };

export class Participant extends Entity<ParticipantProps> {
  private constructor(params: ParticipantConstructorParams) {
    super(params);
  }

  get name(): ParticipantName { return this.props.name; }
  get email(): ParticipantEmail { return this.props.email; }
  get cpf(): ParticipantCpf { return this.props.cpf; }
  get passwordHash(): ParticipantPasswordHash { return this.props.passwordHash; }

  static create(params: CreateParticipantParams): Result<Participant> {
    const nameResult = ParticipantName.create(params.name);
    if (nameResult.isFailure) return Result.fail(nameResult.error);
    const emailResult = ParticipantEmail.create(params.email);
    if (emailResult.isFailure) return Result.fail(emailResult.error);
    const cpfResult = ParticipantCpf.create(params.cpf);
    if (cpfResult.isFailure) return Result.fail(cpfResult.error);

    return Result.ok(new Participant({
      props: {
        name: nameResult.value,
        email: emailResult.value,
        cpf: cpfResult.value,
        passwordHash: params.passwordHash,
      },
    }));
  }

  static reconstitute(params: ReconstituteParticipantParams): Participant {
    return new Participant(params);
  }

  changeName(params: ChangeParticipantNameParams): Result<void, InvalidParticipantNameError> {
    const nameResult = ParticipantName.create(params.name);
    if (nameResult.isFailure) return Result.fail(nameResult.error);
    this.props.name = nameResult.value;
    this.touch();
    return Result.ok();
  }

}
