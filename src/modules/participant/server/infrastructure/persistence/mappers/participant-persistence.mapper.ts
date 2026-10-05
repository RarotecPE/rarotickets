import { PersistenceMapper } from '@core/application/persistence-mapper.base';
import type { ToDomainParams, ToPersistenceParams } from '@core/application/persistence-mapper.base';
import { Identifier } from '@core/domain/identifier';
import { Participant } from '../../../../domain/entities/participant.entity';
import { ParticipantConsent } from '../../../../domain/entities/participant-consent.entity';
import { BirthDate } from '../../../../domain/value-objects/birth-date.vo';
import { City } from '@core/domain/value-objects/city.vo';
import { Cnpj } from '../../../../domain/value-objects/cnpj.vo';
import { Company } from '../../../../domain/value-objects/company.vo';
import { ConsentType } from '../../../../domain/value-objects/consent-type.vo';
import { Cpf } from '../../../../domain/value-objects/cpf.vo';
import { JobTitle } from '../../../../domain/value-objects/job-title.vo';
import { ParticipantEmail } from '../../../../domain/value-objects/participant-email.vo';
import { ParticipantName } from '../../../../domain/value-objects/participant-name.vo';
import { Phone } from '../../../../domain/value-objects/phone.vo';
import { State } from '@core/domain/value-objects/state.vo';
import type {
  ParticipantConsentModel,
  ParticipantConsentModelData,
  ParticipantModel,
  ParticipantModelData,
} from '../models/participant.model';

export type ParticipantToDomainParams = ToDomainParams<ParticipantModel>;
export type ParticipantToPersistenceParams = ToPersistenceParams<Participant>;
export type ConsentToDomainParams = ToDomainParams<ParticipantConsentModel>;
export type ConsentToPersistenceParams = ToPersistenceParams<ParticipantConsent>;

export class ParticipantPersistenceMapper extends PersistenceMapper<
  Participant,
  ParticipantModel,
  ParticipantModelData
> {
  public toDomain({ record }: ParticipantToDomainParams): Participant {
    return Participant.reconstitute({
      props: {
        name: ParticipantName.reconstitute(record.name),
        email: ParticipantEmail.reconstitute(record.email),
        cpf: record.cpf ? Cpf.reconstitute(record.cpf) : null,
        cnpj: record.cnpj ? Cnpj.reconstitute(record.cnpj) : null,
        phone: record.phone ? Phone.reconstitute(record.phone) : null,
        birthDate: record.birth_date ? BirthDate.reconstitute(record.birth_date) : null,
        company: record.company ? Company.reconstitute(record.company) : null,
        jobTitle: record.job_title ? JobTitle.reconstitute(record.job_title) : null,
        city: record.city ? City.reconstitute(record.city) : null,
        state: record.state ? State.reconstitute(record.state) : null,
      },
      id: Identifier.fromExisting(record.id),
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    });
  }

  public toPersistence({ entity }: ParticipantToPersistenceParams): ParticipantModelData {
    return {
      id: entity.id.toString(),
      name: entity.name.value,
      cpf: entity.cpf?.value ?? null,
      cnpj: entity.cnpj?.value ?? null,
      email: entity.email.value,
      phone: entity.phone?.value ?? null,
      birth_date: entity.birthDate?.value ?? null,
      company: entity.company?.value ?? null,
      job_title: entity.jobTitle?.value ?? null,
      city: entity.city?.value ?? null,
      state: entity.state?.value ?? null,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    };
  }
}

export class ParticipantConsentPersistenceMapper extends PersistenceMapper<
  ParticipantConsent,
  ParticipantConsentModel,
  ParticipantConsentModelData
> {
  public toDomain({ record }: ConsentToDomainParams): ParticipantConsent {
    return ParticipantConsent.reconstitute({
      props: {
        participantId: record.participant_id,
        type: ConsentType.reconstitute(record.type as never),
        version: record.version,
        accepted: record.accepted,
        acceptedAt: record.accepted_at,
        ip: record.ip,
      },
      id: Identifier.fromExisting(record.id),
      createdAt: record.created_at,
      updatedAt: record.created_at,
    });
  }

  public toPersistence({ entity }: ConsentToPersistenceParams): ParticipantConsentModelData {
    return {
      id: entity.id.toString(),
      participant_id: entity.participantId,
      type: entity.type.value,
      version: entity.version,
      accepted: entity.accepted,
      accepted_at: entity.acceptedAt,
      ip: entity.ip,
      created_at: entity.createdAt,
    };
  }
}
