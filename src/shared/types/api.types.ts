import type { PaginationMeta } from '@core/application/pagination/pagination';

export type ApiSuccessResponse<Data> = {
  data: Data;
  meta?: PaginationMeta & Record<string, unknown>;
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
};

export type ApiResponse<Data> = ApiSuccessResponse<Data> | ApiErrorResponse;

export function isApiError<Data>(response: ApiResponse<Data>): response is ApiErrorResponse {
  return typeof response === 'object' && response !== null && 'error' in response;
}
