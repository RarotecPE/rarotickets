import { ApiService } from '@/client/services/api-service.base';
import type { ApiServiceDependencies } from '@/client/services/api-service.base';

export type CouponView = {
  id: string;
  eventId: string;
  code: string;
  type: string;
  typeLabel: string;
  value: number;
  valueLabel: string;
  maxUses: number;
  usedCount: number;
  remainingUses: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ValidateCouponResponse = {
  coupon: CouponView;
  discountCents: number;
  finalAmountCents: number;
  isCourtesy: boolean;
  discountFormatted: string;
  finalAmountFormatted: string;
};

export type CouponListParams = { eventId?: string; search?: string; isActive?: boolean; page?: number; perPage?: number };

/** Cupons de desconto e cortesia (§25). */
export class CouponApiService extends ApiService {
  constructor(dependencies: ApiServiceDependencies) {
    super(dependencies);
  }

  async validate(params: { eventId: string; code: string; amountCents: number }): Promise<ValidateCouponResponse> {
    const response = await this.httpClient.post<ValidateCouponResponse>('/coupons/validate', params);
    return response.data;
  }

  async list(params: CouponListParams = {}): Promise<{ coupons: CouponView[]; total: number }> {
    const response = await this.httpClient.get<CouponView[]>('/admin/coupons', {
      query: {
        eventId: params.eventId,
        search: params.search,
        isActive: params.isActive === undefined ? undefined : String(params.isActive),
        page: params.page,
        perPage: params.perPage ?? 30,
      },
    });
    return { coupons: response.data, total: Number(response.meta?.total ?? response.data.length) };
  }

  async create(body: Record<string, unknown>): Promise<{ coupon: CouponView }> {
    const response = await this.httpClient.post<{ coupon: CouponView }>('/admin/coupons', body);
    return response.data;
  }

  async update(couponId: string, body: Record<string, unknown>): Promise<{ coupon: CouponView }> {
    const response = await this.httpClient.put<{ coupon: CouponView }>(`/admin/coupons/${couponId}`, body);
    return response.data;
  }

  async deactivate(couponId: string): Promise<void> {
    await this.httpClient.delete<void>(`/admin/coupons/${couponId}`);
  }
}
