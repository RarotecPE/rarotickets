export type ListUsersInputDto = {
  search?: string | null;
  role?: string | null;
  isActive?: boolean | null;
  page?: number;
  perPage?: number;
};
