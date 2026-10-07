import { ValueObject } from "@/@core/domain/value-object.base";
import { Result } from "@/@core/domain/result";
import { DomainError } from "@/@core/domain/errors/domain-error.base";

export type ParticipantNameValue = string;
export type ParticipantNameProps = { value: ParticipantNameValue };
export class InvalidParticipantNameError extends DomainError {
  constructor() {
    super({ code: "INVALID_PARTICIPANT_NAME", message: "Informe o nome completo da pessoa participante (até 180 caracteres)." });
  }
}

export class ParticipantName extends ValueObject<ParticipantNameProps> {
  private constructor(props: ParticipantNameProps) {
    super(props);
  }

  get value(): string { return this.props.value; }

  static create(value: ParticipantNameValue): Result<ParticipantName, InvalidParticipantNameError> {
    const normalized = value.trim().replace(/\s+/g, " ");
    if (normalized.length < 2 || normalized.length > 180) return Result.fail(new InvalidParticipantNameError());
    return Result.ok(new ParticipantName({ value: normalized }));
  }

  static reconstitute(value: ParticipantNameValue): ParticipantName {
    return new ParticipantName({ value: value.trim().replace(/\s+/g, " ") });
  }
}
