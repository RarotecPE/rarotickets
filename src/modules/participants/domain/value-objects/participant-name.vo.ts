import { ValueObject } from '../../../../@core/domain/value-object.base';
import { Result } from '../../../../@core/domain/result';
import { InvalidParticipantNameError } from '../errors/invalid-participant-name.error';

export type ParticipantNameValue = string;
export type ParticipantNameProps = { value: ParticipantNameValue };

export class ParticipantName extends ValueObject<ParticipantNameProps> {
  private constructor(props: ParticipantNameProps) {
    super(props);
  }

  get value(): ParticipantNameValue {
    return this.props.value;
  }

  static create(value: ParticipantNameValue): Result<ParticipantName, InvalidParticipantNameError> {
    const normalizedValue = value.trim().replace(/\s+/g, ' ');
    if (normalizedValue.length < 2 || normalizedValue.length > 120) {
      return Result.fail(new InvalidParticipantNameError());
    }
    return Result.ok(new ParticipantName({ value: normalizedValue }));
  }

  static reconstitute(value: ParticipantNameValue): ParticipantName {
    return new ParticipantName({ value });
  }
}
