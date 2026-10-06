import { ValueObject } from '../../../../@core/domain/value-object.base';
import { Result } from '../../../../@core/domain/result';
import { InvalidParticipantEmailError } from '../errors/invalid-participant-email.error';

export type ParticipantEmailValue = string;
export type ParticipantEmailProps = { value: ParticipantEmailValue };

export class ParticipantEmail extends ValueObject<ParticipantEmailProps> {
  private constructor(props: ParticipantEmailProps) {
    super(props);
  }

  get value(): ParticipantEmailValue {
    return this.props.value;
  }

  static create(value: ParticipantEmailValue): Result<ParticipantEmail, InvalidParticipantEmailError> {
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue)) {
      return Result.fail(new InvalidParticipantEmailError());
    }
    return Result.ok(new ParticipantEmail({ value: normalizedValue }));
  }

  static reconstitute(value: ParticipantEmailValue): ParticipantEmail {
    return new ParticipantEmail({ value });
  }
}
