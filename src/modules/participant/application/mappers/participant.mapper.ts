import { Mapper } from '@core/application/mapper.base';
import type { Participant } from '../../domain/entities/participant.entity';
import type { ParticipantConsent } from '../../domain/entities/participant-consent.entity';

export type MapParticipantParams = { participant: Participant; consents?: ParticipantConsent[] };
export type ParticipantConsentDto = {
  type: string;
  version: string;
  accepted: boolean;
  acceptedAt: Date | null;
};
export type ParticipantDto = {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  cpfFormatted: string | null;
  cnpj: string | null;
  phone: string | null;
  birthDate: string | null;
  company: string | null;
  jobTitle: string | null;
  city: string | null;
  state: string | null;
  consents: ParticipantConsentDto[];
  createdAt: Date;
  updatedAt: Date;
};

export class ParticipantMapper extends Mapper<MapParticipantParams, ParticipantDto> {
  public map({ participant, consents }: MapParticipantParams): ParticipantDto {
    return {
      id: participant.id.toString(),
      name: participant.name.value,
      email: participant.email.value,
      cpf: participant.cpf?.value ?? null,
      cpfFormatted: participant.cpf?.formatted ?? null,
      cnpj: participant.cnpj?.value ?? null,
      phone: participant.phone?.value ?? null,
      birthDate: participant.birthDate ? participant.birthDate.value.toISOString().slice(0, 10) : null,
      company: participant.company?.value ?? null,
      jobTitle: participant.jobTitle?.value ?? null,
      city: participant.city?.value ?? null,
      state: participant.state?.value ?? null,
      consents: (consents ?? []).map((consent) => ({
        type: consent.type.value,
        version: consent.version,
        accepted: consent.accepted,
        acceptedAt: consent.acceptedAt,
      })),
      createdAt: participant.createdAt,
      updatedAt: participant.updatedAt,
    };
  }
}
