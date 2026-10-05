import { ApiService } from '@/client/services/api-service.base';
import type { ApiServiceDependencies } from '@/client/services/api-service.base';

export type AuditEntryView = {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  description: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
};

export type AuditListParams = {
  actorUserId?: string;
  entity?: string;
  action?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
};

export type AuditListResponse = { entries: AuditEntryView[]; entities: string[]; total: number };

/** Consulta da trilha de auditoria (§36). */
export class AuditApiService extends ApiService {
  constructor(dependencies: ApiServiceDependencies) {
    super(dependencies);
  }

  async list(params: AuditListParams = {}): Promise<AuditListResponse> {
    const response = await this.httpClient.get<AuditEntryView[]>('/admin/audit-logs', {
      query: {
        actorUserId: params.actorUserId,
        entity: params.entity,
        action: params.action,
        search: params.search,
        from: params.from,
        to: params.to,
        page: params.page,
        perPage: params.perPage ?? 30,
      },
    });
    const meta = response.meta ?? {};
    return {
      entries: response.data,
      entities: (meta.entities as string[]) ?? [],
      total: Number(meta.total ?? response.data.length),
    };
  }
}
