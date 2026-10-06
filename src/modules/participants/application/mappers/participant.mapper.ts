import { Mapper } from '../../../../@core/application/mapper.base';
import type { Participant } from '../../domain/entities/participant.entity';
import type { ParticipantDto } from '../types/participant.dto';

export type MapParticipantParams = { participant: Participant };

export class ParticipantMapper extends Mapper<MapParticipantParams, ParticipantDto> {
  map(params: MapParticipantParams): ParticipantDto {
    return {
      id: params.participant.id.toString(),
      name: params.participant.name.value,
      email: params.participant.email.value,
      cpfMasked: params.participant.cpf.maskedValue,
      createdAt: params.participant.createdAt.toISOString(),
    };
  }
}
