export type RaroNexusUserSnapshot = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type RaroNexusRoleSnapshot = {
  key: string;
  name: string;
};

export type ExchangeAuthorizationCodeParams = {
  code: string;
  redirectUri: string;
};

export type RaroNexusAuthorizationResponse = {
  token: string;
  user: RaroNexusUserSnapshot;
  role: RaroNexusRoleSnapshot;
};

export type IntrospectGlobalSessionParams = { token: string };

export type RaroNexusIntrospectionResponse = {
  active: boolean;
  user?: RaroNexusUserSnapshot;
  role?: RaroNexusRoleSnapshot;
};

export type RevokeGlobalSessionParams = { token: string };
export type ListRaroNexusApplicationsParams = { token: string };

export type RaroNexusApplicationSnapshot = {
  name: string;
  clientId: string;
  logoUrl: string | null;
  homepageUrl: string | null;
  active: boolean;
};

export interface IRaroNexusProvider {
  exchangeAuthorizationCode(params: ExchangeAuthorizationCodeParams): Promise<RaroNexusAuthorizationResponse>;
  introspectGlobalSession(params: IntrospectGlobalSessionParams): Promise<RaroNexusIntrospectionResponse>;
  revokeGlobalSession(params: RevokeGlobalSessionParams): Promise<boolean>;
  listApplications(params: ListRaroNexusApplicationsParams): Promise<RaroNexusApplicationSnapshot[]>;
}

export const RARO_NEXUS_PROVIDER = Symbol('IRaroNexusProvider');
