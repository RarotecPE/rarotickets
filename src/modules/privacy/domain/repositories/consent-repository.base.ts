import type { ConsentRecord, ConsentHistoryParams } from '../entities/consent-record.entity.ts';
import type { IConsentRepository } from './consent-repository.interface.ts';

export abstract class ConsentRepository implements IConsentRepository {
  abstract append(record: ConsentRecord): Promise<void>;
  abstract listForParticipant(params: ConsentHistoryParams): Promise<ConsentRecord[]>;
}
