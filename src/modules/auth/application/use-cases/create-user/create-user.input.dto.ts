export type CreateUserInputDto = {
  name: string;
  email: string;
  password: string;
  role: string;
  permissions?: string[];
  actorUserId: string;
  actorName: string;
  ip?: string | null;
};
