import { AggregateRoot } from '../../../../@core/domain/aggregate-root.base.ts';
import type { EntityConstructorParams } from '../../../../@core/domain/entity.base.ts';
import { Identifier } from '../../../../@core/domain/identifier.ts';
import { Cnpj } from '../../../../@core/domain/value-objects/cnpj.vo.ts';
import { Cpf } from '../../../../@core/domain/value-objects/cpf.vo.ts';
import { Email } from '../../../../@core/domain/value-objects/email.vo.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { ValidationError } from '../../../../@core/domain/errors/domain-errors.ts';

export type ParticipantProps = {
  name: string | null;
  cpf: string | null;
  email: string | null;
  phone: string | null;
  birthDate: Date | null;
  company: string | null;
  jobTitle: string | null;
  municipality: string | null;
  state: string | null;
  cnpj: string | null;
};
export type CreateParticipantParams = ParticipantProps & { id?: string; now?: Date };
export type ChangeParticipantProfileParams = ParticipantProps & { now: Date };
export type ParticipantSnapshot = ParticipantProps & { id: string; createdAt: Date; updatedAt: Date };

export class Participant extends AggregateRoot<ParticipantProps> {
  private constructor(params: EntityConstructorParams<ParticipantProps>) {
    super(params);
  }

  public static create(params: CreateParticipantParams): Result<Participant, ValidationError> {
    const invalid = this.validate(params);
    if (invalid) return Result.fail(invalid);
    const normalized = this.normalize(params);
    const entityParams: EntityConstructorParams<ParticipantProps> = {
      props: normalized,
      ...(params.now ? { createdAt: params.now, updatedAt: params.now } : {}),
    };
    if (params.id) entityParams.id = Identifier.fromExisting(params.id);
    return Result.ok(new Participant(entityParams));
  }

  public get name(): string | null { return this.props.name; }
  public get cpf(): string | null { return this.props.cpf; }
  public get email(): string | null { return this.props.email; }
  public get phone(): string | null { return this.props.phone; }
  public get birthDate(): Date | null { return this.props.birthDate ? new Date(this.props.birthDate.getTime()) : null; }
  public get company(): string | null { return this.props.company; }
  public get jobTitle(): string | null { return this.props.jobTitle; }
  public get municipality(): string | null { return this.props.municipality; }
  public get state(): string | null { return this.props.state; }
  public get cnpj(): string | null { return this.props.cnpj; }

  public changeProfile(params: ChangeParticipantProfileParams): Result<void, ValidationError> {
    const invalid = Participant.validate(params);
    if (invalid) return Result.fail(invalid);
    const normalized = Participant.normalize(params);
    Object.assign(this.props, normalized);
    this.touch({ at: params.now });
    return Result.ok();
  }

  /** Removes personal data while preserving the participant identity used by registrations. */
  public anonymize(now: Date): void {
    Object.assign(this.props, {
      name: null,
      cpf: null,
      email: null,
      phone: null,
      birthDate: null,
      company: null,
      jobTitle: null,
      municipality: null,
      state: null,
      cnpj: null,
    } satisfies ParticipantProps);
    this.touch({ at: now });
  }

  public snapshot(): ParticipantSnapshot {
    return {
      ...this.props,
      birthDate: this.birthDate,
      id: this.id.toString(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private static normalize(params: ParticipantProps): ParticipantProps {
    return {
      name: this.clean(params.name),
      cpf: params.cpf ? Cpf.reconstitute(params.cpf).value : null,
      email: params.email ? Email.reconstitute(params.email).value : null,
      phone: this.clean(params.phone),
      birthDate: params.birthDate ? new Date(params.birthDate.getTime()) : null,
      company: this.clean(params.company),
      jobTitle: this.clean(params.jobTitle),
      municipality: this.clean(params.municipality),
      state: this.clean(params.state),
      cnpj: params.cnpj ? Cnpj.reconstitute(params.cnpj).value : null,
    };
  }

  private static validate(params: ParticipantProps): ValidationError | null {
    if (params.cpf && Cpf.create(params.cpf).isFailure) {
      return new ValidationError({ code: 'PARTICIPANT_CPF_INVALID', message: 'O CPF informado é inválido.' });
    }
    if (params.email && Email.create(params.email).isFailure) {
      return new ValidationError({ code: 'PARTICIPANT_EMAIL_INVALID', message: 'O e-mail informado é inválido.' });
    }
    if (params.cnpj && Cnpj.create(params.cnpj).isFailure) {
      return new ValidationError({ code: 'PARTICIPANT_CNPJ_INVALID', message: 'O CNPJ informado é inválido.' });
    }
    if (params.birthDate && !Number.isFinite(params.birthDate.getTime())) {
      return new ValidationError({ code: 'PARTICIPANT_BIRTH_DATE_INVALID', message: 'A data de nascimento é inválida.' });
    }
    return null;
  }

  private static clean(value: string | null): string | null {
    return value?.trim() || null;
  }
}
