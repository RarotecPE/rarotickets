export type ListUsersQuery = {
  search?: string;
  role?: string;
  isActive?: string;
  page?: string;
  perPage?: string;
};

export type CreateUserRequestBody = {
  name: string;
  email: string;
  password: string;
  role: string;
  permissions?: string[];
};

export type UpdateUserRequestBody = {
  name?: string;
  role?: string;
  permissions?: string[];
  isActive?: boolean;
};

export type UserActionRequest =
  | { action: 'list'; query: ListUsersQuery }
  | { action: 'create'; body: CreateUserRequestBody }
  | { action: 'update'; userId: string; body: UpdateUserRequestBody };
