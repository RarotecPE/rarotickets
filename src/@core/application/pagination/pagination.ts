export type PaginationParams = { page: number; perPage: number };

export type PaginationMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export type PaginatedResult<Item> = {
  items: Item[];
  meta: PaginationMeta;
};

export const DEFAULT_PAGE = 1;
export const DEFAULT_PER_PAGE = 20;
export const MAX_PER_PAGE = 100;

export function normalizePagination(params?: Partial<PaginationParams>): PaginationParams {
  const page = params?.page && params.page > 0 ? Math.floor(params.page) : DEFAULT_PAGE;
  const requested = params?.perPage && params.perPage > 0 ? Math.floor(params.perPage) : DEFAULT_PER_PAGE;
  return { page, perPage: Math.min(requested, MAX_PER_PAGE) };
}

export function buildPaginationMeta(params: PaginationParams & { total: number }): PaginationMeta {
  return {
    page: params.page,
    perPage: params.perPage,
    total: params.total,
    totalPages: params.total === 0 ? 0 : Math.ceil(params.total / params.perPage),
  };
}
