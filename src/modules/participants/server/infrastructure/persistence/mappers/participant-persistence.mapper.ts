import { PersistenceMapper } from '../../../../../../@core/application/persistence-mapper.base';
import { Identifier } from '../../../../../../@core/domain/identifier';
import { Participant } from '../../../../domain/entities/participant.entity';
import { ParticipantCpf } from '../../../../domain/value-objects/participant-cpf.vo';
import { ParticipantEmail } from '../../../../domain/value-objects/participant-email.vo';
import { ParticipantName } from '../../../../domain/value-objects/participant-name.vo';
import type { ParticipantModel } from '../models/participant.model';

export type ParticipantToDomainParams = { record: ParticipantModel };
export type ParticipantToPersistenceParams = { entity: Participant };

export class ParticipantPersistenceMapper extends PersistenceMapper<Participant, ParticipantModel, ParticipantModel> {
  toDomain(params: ParticipantToDomainParams): Participant {
    const record = params.record;
    return Participant.reconstitute({
      id: Identifier.fromExisting(record.id),
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      props: {
        name: ParticipantName.reconstitute(record.name),
        email: ParticipantEmail.reconstitute(record.email),
        cpf: ParticipantCpf.reconstitute(record.cpf),
        passwordHash: record.passwordHash,
      },
    });
  }

  toPersistence(params: ParticipantToPersistenceParams): ParticipantModel {
    const participant = params.entity;
    return {
      id: participant.id.toString(),
      name: participant.name.value,
      email: participant.email.value,
      cpf: participant.cpf.value,
      passwordHash: participant.passwordHash,
      createdAt: participant.createdAt.toISOString(),
      updatedAt: participant.updatedAt.toISOString(),
    };
  }
}
