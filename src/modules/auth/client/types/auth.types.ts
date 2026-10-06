import type { ApplicationPermission, ApplicationRoleKey } from '../../domain/value-objects/application-role.vo';

export type AuthUserView = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type AuthSessionView = {
  user: AuthUserView;
  role: { key: ApplicationRoleKey; name: string };
  permissions: ApplicationPermission[];
};

export type AuthSessionResponse = {
  data: {
    authenticated: boolean;
    authorized: boolean;
    demo?: boolean;
    session?: AuthSessionView;
  };
};

export type AuthStatusResponse = {
  data: {
    raronexusConfigured: boolean;
    demoLoginEnabled: boolean;
    raronexusHomeUrl: string | null;
    raronexusProfileUrl: string | null;
  };
};

export type ApplicationCatalogResponse = {
  data: {
    applications: Array<{
      name: string;
      clientId: string;
      logoUrl: string | null;
      homepageUrl: string;
    }>;
  };
};

export type LogoutResponse = {
  data: {
    localSessionCleared: boolean;
    globalSessionRevoked: boolean;
  };
};
