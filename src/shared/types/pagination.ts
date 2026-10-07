export type PaginationParams = { page: number; perPage: number };
export type PaginatedResult<T> = {
  data: T[];
  meta: { page: number; perPage: number; total: number; totalPages: number };
};
