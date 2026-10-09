import type { AppRole, Permission } from "@/modules/access/domain/services/role-permissions.domain-service";

export type AuthenticatedUser = {
  id: string;
  nome: string;
  email: string;
  avatar_url: string | null;
};
export type AuthSession = {
  user: AuthenticatedUser;
  role: AppRole;
  roleKey: string;
  label: string;
  permissions: Permission[];
};
export type AuthFailureKind = "unauthenticated" | "forbidden" | "unavailable";
export type AuthFailureParams = { kind: AuthFailureKind; code: string; message: string; httpStatus: 401 | 403 | 503 };
export type RaroNexusProfile = { chave: string; nome: string };
export type RaroNexusUser = AuthenticatedUser;
export type SessionView = {
  authenticated: boolean;
  role: AppRole | null;
  label: string | null;
  user: AuthenticatedUser | null;
  permissions: Permission[];
};
