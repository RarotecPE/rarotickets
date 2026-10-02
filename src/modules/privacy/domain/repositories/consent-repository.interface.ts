import type { ConsentRecord, ConsentHistoryParams } from '../entities/consent-record.entity.ts';

export interface IConsentRepository {
  append(record: ConsentRecord): Promise<void>;
  listForParticipant(params: ConsentHistoryParams): Promise<ConsentRecord[]>;
}
