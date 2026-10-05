import { AggregateRoot } from '@core/domain/aggregate-root.base';
import type { EntityConstructorParams } from '@core/domain/entity.base';
import { Result } from '@core/domain/result';
import { BirthDate } from '../value-objects/birth-date.vo';
import { City } from '@core/domain/value-objects/city.vo';
import { Cnpj } from '../value-objects/cnpj.vo';
import { Company } from '../value-objects/company.vo';
import { Cpf } from '../value-objects/cpf.vo';
import { JobTitle } from '../value-objects/job-title.vo';
import { ParticipantEmail } from '../value-objects/participant-email.vo';
import { ParticipantName } from '../value-objects/participant-name.vo';
import { Phone } from '../value-objects/phone.vo';
import { State } from '@core/domain/value-objects/state.vo';

export type ParticipantProps = {
  name: ParticipantName;
  email: ParticipantEmail;
  cpf: Cpf | null;
  cnpj: Cnpj | null;
  phone: Phone | null;
  birthDate: BirthDate | null;
  company: Company | null;
  jobTitle: JobTitle | null;
  city: City | null;
  state: State | null;
};
export type ParticipantConstructorParams = EntityConstructorParams<ParticipantProps>;
export type ReconstituteParticipantParams = ParticipantConstructorParams & {
  id: NonNullable<ParticipantConstructorParams['id']>;
};
export type ParticipantProfileInput = {
  name: string;
  email: string;
  cpf?: string | null;
  cnpj?: string | null;
  phone?: string | null;
  birthDate?: string | Date | null;
  company?: string | null;
  jobTitle?: string | null;
  city?: string | null;
  state?: string | null;
};

/**
 * Cadastro principal do participante (§6): independente das inscrições, uma
 * mesma pessoa participa de vários eventos sem duplicar seus dados (§41).
 */
export class Participant extends AggregateRoot<ParticipantProps> {
  private constructor(params: ParticipantConstructorParams) {
    super(params);
  }

  get name(): ParticipantName { return this.props.name; }
  get email(): ParticipantEmail { return this.props.email; }
  get cpf(): Cpf | null { return this.props.cpf; }
  get cnpj(): Cnpj | null { return this.props.cnpj; }
  get phone(): Phone | null { return this.props.phone; }
  get birthDate(): BirthDate | null { return this.props.birthDate; }
  get company(): Company | null { return this.props.company; }
  get jobTitle(): JobTitle | null { return this.props.jobTitle; }
  get city(): City | null { return this.props.city; }
  get state(): State | null { return this.props.state; }

  public static create(input: ParticipantProfileInput): Result<Participant> {
    const propsResult = Participant.buildProps(input);
    if (propsResult.isFailure) return Result.fail(propsResult.error);
    return Result.ok(new Participant({ props: propsResult.value }));
  }

  public static reconstitute(params: ReconstituteParticipantParams): Participant {
    return new Participant(params);
  }

  /** Atualiza o cadastro principal, preenchendo dados ausentes sem apagá-los. */
  public updateProfile(input: ParticipantProfileInput): Result<void> {
    const propsResult = Participant.buildProps({
      name: input.name,
      email: input.email,
      cpf: input.cpf ?? this.props.cpf?.value ?? null,
      cnpj: input.cnpj ?? this.props.cnpj?.value ?? null,
      phone: input.phone ?? this.props.phone?.value ?? null,
      birthDate: input.birthDate ?? this.props.birthDate?.value ?? null,
      company: input.company ?? this.props.company?.value ?? null,
      jobTitle: input.jobTitle ?? this.props.jobTitle?.value ?? null,
      city: input.city ?? this.props.city?.value ?? null,
      state: input.state ?? this.props.state?.value ?? null,
    });
    if (propsResult.isFailure) return Result.fail(propsResult.error);

    this.props.name = propsResult.value.name;
    this.props.email = propsResult.value.email;
    this.props.cpf = propsResult.value.cpf;
    this.props.cnpj = propsResult.value.cnpj;
    this.props.phone = propsResult.value.phone;
    this.props.birthDate = propsResult.value.birthDate;
    this.props.company = propsResult.value.company;
    this.props.jobTitle = propsResult.value.jobTitle;
    this.props.city = propsResult.value.city;
    this.props.state = propsResult.value.state;
    this.touch();
    return Result.ok();
  }

  private static buildProps(input: ParticipantProfileInput): Result<ParticipantProps> {
    const nameResult = ParticipantName.create(input.name);
    if (nameResult.isFailure) return Result.fail(nameResult.error);

    const emailResult = ParticipantEmail.create(input.email);
    if (emailResult.isFailure) return Result.fail(emailResult.error);

    const cpfResult = optional(input.cpf, Cpf.create);
    if (cpfResult.isFailure) return Result.fail(cpfResult.error);

    const cnpjResult = optional(input.cnpj, Cnpj.create);
    if (cnpjResult.isFailure) return Result.fail(cnpjResult.error);

    const phoneResult = optional(input.phone, Phone.create);
    if (phoneResult.isFailure) return Result.fail(phoneResult.error);

    const birthDateResult = optional(
      input.birthDate === null || input.birthDate === undefined ? null : String(input.birthDate),
      BirthDate.create,
    );
    if (birthDateResult.isFailure) return Result.fail(birthDateResult.error);

    const companyResult = optional(input.company, Company.create);
    if (companyResult.isFailure) return Result.fail(companyResult.error);

    const jobTitleResult = optional(input.jobTitle, JobTitle.create);
    if (jobTitleResult.isFailure) return Result.fail(jobTitleResult.error);

    const cityResult = optional(input.city, City.create);
    if (cityResult.isFailure) return Result.fail(cityResult.error);

    const stateResult = optional(input.state, State.create);
    if (stateResult.isFailure) return Result.fail(stateResult.error);

    return Result.ok({
      name: nameResult.value,
      email: emailResult.value,
      cpf: cpfResult.value,
      cnpj: cnpjResult.value,
      phone: phoneResult.value,
      birthDate: birthDateResult.value,
      company: companyResult.value,
      jobTitle: jobTitleResult.value,
      city: cityResult.value,
      state: stateResult.value,
    });
  }
}

type OptionalValueObject<Value> = Result<Value | null>;

function optional<Value>(
  rawValue: string | null | undefined,
  factory: (value: string) => Result<Value>,
): OptionalValueObject<Value> {
  if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') {
    return Result.ok<Value | null>(null);
  }
  return factory(String(rawValue));
}
