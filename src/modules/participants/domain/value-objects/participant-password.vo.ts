import { ValueObject } from '../../../../@core/domain/value-object.base';
import { Result } from '../../../../@core/domain/result';
import { InvalidParticipantPasswordError } from '../errors/invalid-participant-password.error';

export type ParticipantPasswordValue = string;
export type ParticipantPasswordProps = { value: ParticipantPasswordValue };

export class ParticipantPassword extends ValueObject<ParticipantPasswordProps> {
  private constructor(props: ParticipantPasswordProps) {
    super(props);
  }

  get value(): ParticipantPasswordValue {
    return this.props.value;
  }

  static create(value: ParticipantPasswordValue): Result<ParticipantPassword, InvalidParticipantPasswordError> {
    if (value.length < 8 || value.length > 128) {
      return Result.fail(new InvalidParticipantPasswordError());
    }
    return Result.ok(new ParticipantPassword({ value }));
  }
}
