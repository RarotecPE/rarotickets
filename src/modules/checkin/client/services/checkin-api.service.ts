import { ApiService } from '@/client/services/api-service.base';
import type { ApiServiceDependencies } from '@/client/services/api-service.base';

export type CheckInRecordView = {
  id: string;
  registrationId: string;
  registrationCode: string;
  participantName: string;
  participantEmail: string | null;
  checkedInAt: string;
  operatorName: string | null;
  method: string;
  isOverride: boolean;
  overrideReason: string | null;
};

export type CheckInStatsView = {
  expected: number;
  checkedIn: number;
  absent: number;
  cancelled: number;
  waitlisted: number;
  attendanceRate: number;
  attendanceRateLabel: string;
};

export type CheckInLookupView = {
  registrationId: string;
  registrationCode: string;
  eventId: string;
  eventTitle: string;
  participantId: string;
  participantName: string;
  participantEmail: string | null;
  status: string;
  hasCheckedIn: boolean;
  checkedInAt: string | null;
  canCheckIn: boolean;
  reason: string | null;
};

export type CheckInBoardResponse = { records: CheckInRecordView[]; stats: CheckInStatsView; total: number };

/** Painel de credenciamento (§29). */
export class CheckInApiService extends ApiService {
  constructor(dependencies: ApiServiceDependencies) {
    super(dependencies);
  }

  async board(params: {
    eventId: string;
    search?: string;
    onlyOverrides?: boolean;
    page?: number;
    perPage?: number;
  }): Promise<CheckInBoardResponse> {
    const response = await this.httpClient.get<CheckInRecordView[]>('/admin/check-ins', {
      query: {
        eventId: params.eventId,
        search: params.search,
        onlyOverrides: params.onlyOverrides ? 'true' : undefined,
        page: params.page,
        perPage: params.perPage ?? 50,
      },
    });
    const meta = response.meta ?? {};
    return {
      records: response.data,
      stats:
        (meta.stats as CheckInStatsView) ??
        { expected: 0, checkedIn: 0, absent: 0, cancelled: 0, waitlisted: 0, attendanceRate: 0, attendanceRateLabel: '0%' },
      total: Number(meta.total ?? response.data.length),
    };
  }

  async lookup(params: { code: string; eventId?: string }): Promise<CheckInLookupView> {
    const response = await this.httpClient.get<CheckInLookupView>('/admin/check-ins/lookup', {
      query: { code: params.code, eventId: params.eventId },
    });
    return response.data;
  }
}
