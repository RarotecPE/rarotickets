import type { ParticipantConsent } from '../entities/participant-consent.entity';
import type { IParticipantConsentRepository } from './participant-consent-repository.interface';

export abstract class ParticipantConsentRepository implements IParticipantConsentRepository {
  abstract listByParticipant(participantId: string): Promise<ParticipantConsent[]>;
  abstract findByTypeAndVersion(params: {
    participantId: string;
    type: string;
    version: string;
  }): Promise<ParticipantConsent | null>;
  abstract save(consent: ParticipantConsent): Promise<void>;
}
