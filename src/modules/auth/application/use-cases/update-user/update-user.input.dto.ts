export type UpdateUserInputDto = {
  userId: string;
  name?: string;
  role?: string;
  permissions?: string[];
  isActive?: boolean;
  actorUserId: string;
  actorName: string;
  ip?: string | null;
};
