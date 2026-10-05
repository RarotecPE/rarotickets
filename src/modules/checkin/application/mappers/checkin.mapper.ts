import { Mapper } from '@core/application/mapper.base';
import type { CheckInRecord } from '../../domain/entities/check-in-record.entity';
import type { CheckInLookup } from '../../domain/repositories/check-in-repository.interface';

export type CheckInRecordDto = {
  id: string;
  registrationId: string;
  registrationCode: string;
  participantName: string;
  participantEmail: string | null;
  checkedInAt: Date;
  operatorName: string | null;
  method: string;
  methodLabel: string;
  isOverride: boolean;
  overrideReason: string | null;
};

export type CheckInLookupDto = {
  registrationId: string;
  registrationCode: string;
  eventId: string;
  eventTitle: string;
  participantId: string;
  participantName: string;
  participantEmail: string | null;
  status: string;
  hasCheckedIn: boolean;
  checkedInAt: Date | null;
  canCheckIn: boolean;
  reason: string | null;
};

export type MapCheckInRecordParams = { record: CheckInRecord };
export type MapCheckInLookupParams = { lookup: CheckInLookup };

/** Converte entidades de credenciamento em dados de transporte (§6.3). */
export class CheckInRecordMapper extends Mapper<MapCheckInRecordParams, CheckInRecordDto> {
  public map({ record }: MapCheckInRecordParams): CheckInRecordDto {
    return {
      id: record.id.toString(),
      registrationId: record.registrationId,
      registrationCode: record.registrationCode,
      participantName: record.participantName,
      participantEmail: record.participantEmail,
      checkedInAt: record.checkedInAt,
      operatorName: record.operatorName,
      method: record.method,
      methodLabel: record.describeMethod(),
      isOverride: record.isOverride,
      overrideReason: record.overrideReason,
    };
  }
}

export class CheckInLookupMapper extends Mapper<MapCheckInLookupParams, CheckInLookupDto> {
  public map({ lookup }: MapCheckInLookupParams): CheckInLookupDto {
    return {
      registrationId: lookup.registrationId,
      registrationCode: lookup.registrationCode,
      eventId: lookup.eventId,
      eventTitle: lookup.eventTitle,
      participantId: lookup.participantId,
      participantName: lookup.participantName,
      participantEmail: lookup.participantEmail,
      status: lookup.status,
      hasCheckedIn: lookup.hasCheckedIn,
      checkedInAt: lookup.checkedInAt,
      canCheckIn: lookup.canCheckIn,
      reason: lookup.reason,
    };
  }
}
