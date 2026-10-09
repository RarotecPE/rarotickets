import { ValueObject } from "@/@core/domain/value-object.base";
import { Result } from "@/@core/domain/result";
import { DomainError } from "@/@core/domain/errors/domain-error.base";

export type ParticipantPasswordProps = { value: string };

export class WeakParticipantPasswordError extends DomainError {
  constructor(message = "A senha deve conter no mínimo 6 caracteres.") {
    super({ code: "WEAK_PASSWORD", message });
  }
}

export class ParticipantPassword extends ValueObject<ParticipantPasswordProps> {
  private constructor(props: ParticipantPasswordProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  static create(value: string): Result<ParticipantPassword, WeakParticipantPasswordError> {
    if (!value || typeof value !== "string" || value.length < 6) {
      return Result.fail(new WeakParticipantPasswordError());
    }
    if (value.length > 128) {
      return Result.fail(new WeakParticipantPasswordError("A senha não pode exceder 128 caracteres."));
    }
    return Result.ok(new ParticipantPassword({ value }));
  }

  static reconstitute(value: string): ParticipantPassword {
    return new ParticipantPassword({ value });
  }
}

