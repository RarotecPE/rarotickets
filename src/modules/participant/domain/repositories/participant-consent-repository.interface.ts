import { ParticipantConsent } from '../entities/participant-consent.entity';

export interface IParticipantConsentRepository {
  listByParticipant(participantId: string): Promise<ParticipantConsent[]>;
  findByTypeAndVersion(params: {
    participantId: string;
    type: string;
    version: string;
  }): Promise<ParticipantConsent | null>;
  save(consent: ParticipantConsent): Promise<void>;
}

export const PARTICIPANT_CONSENT_REPOSITORY = Symbol('IParticipantConsentRepository');
