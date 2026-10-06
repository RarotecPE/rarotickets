import type {
  ExchangeAuthorizationCodeParams,
  IRaroNexusProvider,
  IntrospectGlobalSessionParams,
  ListRaroNexusApplicationsParams,
  RaroNexusApplicationSnapshot,
  RaroNexusAuthorizationResponse,
  RaroNexusIntrospectionResponse,
  RevokeGlobalSessionParams,
} from '../../../domain/services/raro-nexus-provider.interface';

export abstract class RaroNexusProvider implements IRaroNexusProvider {
  abstract exchangeAuthorizationCode(params: ExchangeAuthorizationCodeParams): Promise<RaroNexusAuthorizationResponse>;
  abstract introspectGlobalSession(params: IntrospectGlobalSessionParams): Promise<RaroNexusIntrospectionResponse>;
  abstract revokeGlobalSession(params: RevokeGlobalSessionParams): Promise<boolean>;
  abstract listApplications(params: ListRaroNexusApplicationsParams): Promise<RaroNexusApplicationSnapshot[]>;
}
