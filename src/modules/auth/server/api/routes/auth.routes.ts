import { randomBytes, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncRoute } from '../../../../../server/api/async-route.util';
import { AUTH_COOKIE_NAMES, clearCookie, clearSessionCookies, clearSsoCookies, readCookie, setSessionCookie, setTemporaryCookie } from '../../../../../server/api/cookies';
import { HttpResponse } from '../../../../../server/api/http-response';
import { DomainError } from '../../../../../@core/domain/errors/domain-error.base';
import type { AppConfig } from '../../../../../server/config/app.config';
import { isRaroNexusConfigured } from '../../../../../server/config/app.config';
import { validateInternalRedirect } from '../../../../../server/security/safe-redirect.util';
import { CompleteRaroNexusLoginController } from '../controllers/complete-raro-nexus-login.controller';
import { ListAuthorizedApplicationsController } from '../controllers/list-authorized-applications.controller';
import { ResolveGlobalSessionController } from '../controllers/resolve-global-session.controller';
import { RevokeGlobalSessionController } from '../controllers/revoke-global-session.controller';
import { createRequireAuthMiddleware } from '../middlewares/require-auth.middleware';
import type { RequireAuthMiddlewareDependencies } from '../middlewares/require-auth.middleware';
import { RaroNexusIntegrationError } from '../../infrastructure/providers/raro-nexus-integration.error';
import { DemoSessionRegistry } from '../../infrastructure/session/demo-session.registry';

export type AuthRouterDependencies = {
  config: AppConfig;
  completeLoginController: CompleteRaroNexusLoginController;
  resolveSessionController: ResolveGlobalSessionController;
  revokeSessionController: RevokeGlobalSessionController;
  listApplicationsController: ListAuthorizedApplicationsController;
  demoSessionRegistry: DemoSessionRegistry;
};
type AuthRequestRouteParams = { request: Request; response: Response; dependencies: AuthRouterDependencies };
type AuthResponseRouteParams = { response: Response; dependencies: AuthRouterDependencies };
type GetAuthStatusParams = { response: Response; config: AppConfig };
type AuthorizationMode = 'silent' | 'interactive';
type BuildAuthorizationUrlParams = { config: AppConfig; state: string; mode: AuthorizationMode };
type ExchangeCodeAndRedirectParams = { code: string; nextPath: string; response: Response; dependencies: AuthRouterDependencies };
type TryRevokeSessionParams = { token: string; controller: RevokeGlobalSessionController };
type SsoStateValues = { returnedState: string | null; storedState: string | null };
type RedirectToLoginParams = { response: Response; status: string; nextPath?: string };

export function createAuthRouter(dependencies: AuthRouterDependencies): Router {
  const router = Router();
  const authDependencies: RequireAuthMiddlewareDependencies = {
    config: dependencies.config,
    resolveSessionController: dependencies.resolveSessionController,
    demoSessionRegistry: dependencies.demoSessionRegistry,
  };
  const requireAuth = createRequireAuthMiddleware(authDependencies);

  router.get('/status', (_request, response) => getAuthStatus({ response, config: dependencies.config }));
  router.get('/session', asyncRoute((request, response) => getSession({ request, response, dependencies })));
  router.post('/demo', asyncRoute((_request, response) => startDemoSession({ response, dependencies })));
  router.get('/applications', requireAuth, asyncRoute((_request, response) => listApplications({ response, dependencies })));
  router.post('/logout', asyncRoute((request, response) => logout({ request, response, dependencies })));
  router.get('/raronexus/start', (request, response) => startRaroNexusAuthorization({ request, response, dependencies }));
  router.get('/raronexus/callback', asyncRoute((request, response) => completeRaroNexusAuthorization({ request, response, dependencies })));

  return router;
}

function getAuthStatus(params: GetAuthStatusParams): void {
  params.response.setHeader('Cache-Control', 'no-store');
  params.response.json({
    data: {
      raronexusConfigured: isRaroNexusConfigured(params.config),
      demoLoginEnabled: params.config.demoLoginEnabled,
      raronexusHomeUrl: params.config.raronexus.baseUrl ? new URL('/home', params.config.raronexus.baseUrl).toString() : null,
      raronexusProfileUrl: params.config.raronexus.baseUrl ? new URL('/profile', params.config.raronexus.baseUrl).toString() : null,
    },
  });
}

function startRaroNexusAuthorization(params: AuthRequestRouteParams): void {
  const { request, response, dependencies } = params;
  const config = dependencies.config;
  if (!isRaroNexusConfigured(config) || !config.appBaseUrl || !config.raronexus.baseUrl || !config.raronexus.clientId) {
    redirectToLogin({ response, status: 'not_configured' });
    return;
  }

  const nextPath = validateInternalRedirect({
    candidate: readQueryValue(request.query.next),
    appBaseUrl: config.appBaseUrl,
  });
  const mode = readQueryValue(request.query.mode) === 'silent' ? 'silent' : 'interactive';
  const state = randomBytes(24).toString('hex');
  setTemporaryCookie({ response, config, name: AUTH_COOKIE_NAMES.ssoState, value: state });
  setTemporaryCookie({ response, config, name: AUTH_COOKIE_NAMES.ssoNext, value: nextPath });
  setTemporaryCookie({ response, config, name: AUTH_COOKIE_NAMES.ssoMode, value: mode });
  response.redirect(302, buildAuthorizationUrl({ config, state, mode }));
}

function buildAuthorizationUrl(params: BuildAuthorizationUrlParams): string {
  const baseUrl = params.config.raronexus.baseUrl;
  const appBaseUrl = params.config.appBaseUrl;
  const clientId = params.config.raronexus.clientId;
  if (!baseUrl || !appBaseUrl || !clientId) throw new Error('Configuração SSO incompleta.');
  const callbackUrl = new URL('/api/auth/raronexus/callback', appBaseUrl).toString();
  const authorizationUrl = new URL('/sso/authorize', baseUrl);
  authorizationUrl.searchParams.set('client_id', clientId);
  authorizationUrl.searchParams.set('redirect_uri', callbackUrl);
  authorizationUrl.searchParams.set('state', params.state);
  if (params.mode === 'silent') authorizationUrl.searchParams.set('prompt', 'none');
  return authorizationUrl.toString();
}

async function completeRaroNexusAuthorization(params: AuthRequestRouteParams): Promise<void> {
  const { request, response, dependencies } = params;
  const config = dependencies.config;
  const returnedState = readQueryValue(request.query.state);
  const storedState = readCookie({ cookieHeader: request.headers.cookie, name: AUTH_COOKIE_NAMES.ssoState });
  const nextPath = validateInternalRedirect({
    candidate: readCookie({ cookieHeader: request.headers.cookie, name: AUTH_COOKIE_NAMES.ssoNext }),
    appBaseUrl: config.appBaseUrl,
  });
  const mode = readCookie({ cookieHeader: request.headers.cookie, name: AUTH_COOKIE_NAMES.ssoMode }) === 'silent'
    ? 'silent'
    : 'interactive';

  if (!statesMatch({ returnedState, storedState })) {
    clearSsoCookies({ response, config });
    redirectToLogin({ response, status: 'state_mismatch' });
    return;
  }
  clearSsoCookies({ response, config });
  const providerError = readQueryValue(request.query.error);
  if (providerError) {
    const status = providerError === 'login_required' && mode === 'silent' ? 'login_required' : 'provider_error';
    redirectToLogin({ response, status, nextPath });
    return;
  }
  const code = readQueryValue(request.query.code);
  if (!code || code.length > 2048 || !config.appBaseUrl) {
    redirectToLogin({ response, status: 'missing_code', nextPath });
    return;
  }
  await exchangeCodeAndRedirect({ code, nextPath, response, dependencies });
}

async function exchangeCodeAndRedirect(params: ExchangeCodeAndRedirectParams): Promise<void> {
  const { code, nextPath, response, dependencies } = params;
  const { config } = dependencies;
  if (!config.appBaseUrl) {
    redirectToLogin({ response, status: 'not_configured', nextPath });
    return;
  }
  const callbackUrl = new URL('/api/auth/raronexus/callback', config.appBaseUrl).toString();
  try {
    const loginResult = await dependencies.completeLoginController.handle({ code, redirectUri: callbackUrl });
    if (loginResult.isFailure) {
      const status = loginResult.error instanceof DomainError && loginResult.error.code === 'UNKNOWN_APPLICATION_ROLE' ? 'access_denied' : 'provider_error';
      redirectToLogin({ response, status, nextPath });
      return;
    }
    setSessionCookie({
      response,
      config,
      name: AUTH_COOKIE_NAMES.globalSession,
      value: loginResult.value.token,
    });
    clearCookie({ response, config, name: AUTH_COOKIE_NAMES.demoSession });
    response.redirect(302, nextPath);
  } catch (error) {
    if (!(error instanceof RaroNexusIntegrationError)) throw error;
    redirectToLogin({ response, status: 'provider_unavailable', nextPath });
  }
}

async function getSession(params: AuthRequestRouteParams): Promise<void> {
  const { request, response, dependencies } = params;
  response.setHeader('Cache-Control', 'no-store');
  const demoToken = readCookie({ cookieHeader: request.headers.cookie, name: AUTH_COOKIE_NAMES.demoSession });
  if (dependencies.config.demoLoginEnabled && demoToken) {
    const demoSession = dependencies.demoSessionRegistry.find(demoToken);
    if (demoSession) {
      response.json({ data: { authenticated: true, authorized: true, demo: true, session: demoSession } });
      return;
    }
    clearCookie({ response, config: dependencies.config, name: AUTH_COOKIE_NAMES.demoSession });
  }

  const globalToken = readCookie({ cookieHeader: request.headers.cookie, name: AUTH_COOKIE_NAMES.globalSession });
  if (!globalToken) {
    response.json({ data: { authenticated: false, authorized: false } });
    return;
  }
  const sessionResponse = await dependencies.resolveSessionController.handle({ token: globalToken });
  if (sessionResponse.statusCode === 401) {
    clearCookie({ response, config: dependencies.config, name: AUTH_COOKIE_NAMES.globalSession });
  }
  response.status(sessionResponse.statusCode).json(sessionResponse.body);
}

async function startDemoSession(params: AuthResponseRouteParams): Promise<void> {
  const { response, dependencies } = params;
  if (!dependencies.config.demoLoginEnabled) {
    response.status(404).json(HttpResponse.failure({ statusCode: 404, code: 'NOT_FOUND', message: 'Rota não encontrada.' }).body);
    return;
  }
  const demoSession = dependencies.demoSessionRegistry.create();
  setSessionCookie({
    response,
    config: dependencies.config,
    name: AUTH_COOKIE_NAMES.demoSession,
    value: demoSession.token,
  });
  clearCookie({ response, config: dependencies.config, name: AUTH_COOKIE_NAMES.globalSession });
  response.json({ data: { authenticated: true, authorized: true, demo: true, session: demoSession.session } });
}

async function listApplications(params: AuthResponseRouteParams): Promise<void> {
  const { response, dependencies } = params;
  response.setHeader('Cache-Control', 'no-store');
  const authContext = response.locals.authContext;
  if (!authContext) {
    response.status(401).json(HttpResponse.failure({ statusCode: 401, code: 'UNAUTHENTICATED', message: 'Entre para continuar.' }).body);
    return;
  }
  if (authContext.isDemo || !authContext.globalToken) {
    response.json({ data: { applications: [] } });
    return;
  }
  const appResponse = await dependencies.listApplicationsController.handle({ token: authContext.globalToken });
  response.status(appResponse.statusCode).json(appResponse.body);
}

async function logout(params: AuthRequestRouteParams): Promise<void> {
  const { request, response, dependencies } = params;
  const globalToken = readCookie({ cookieHeader: request.headers.cookie, name: AUTH_COOKIE_NAMES.globalSession });
  const demoToken = readCookie({ cookieHeader: request.headers.cookie, name: AUTH_COOKIE_NAMES.demoSession });
  let globalSessionRevoked = false;
  if (globalToken) globalSessionRevoked = await tryRevokeSession({ token: globalToken, controller: dependencies.revokeSessionController });
  if (demoToken) dependencies.demoSessionRegistry.revoke(demoToken);
  clearSessionCookies({ response, config: dependencies.config });
  clearSsoCookies({ response, config: dependencies.config });
  response.json({ data: { localSessionCleared: true, globalSessionRevoked } });
}

async function tryRevokeSession(params: TryRevokeSessionParams): Promise<boolean> {
  try {
    const result = await params.controller.handle({ token: params.token });
    return isRevocationConfirmed(result);
  } catch {
    return false;
  }
}

function isRevocationConfirmed(response: HttpResponse): boolean {
  if (response.statusCode !== 200 || !('data' in response.body)) return false;
  const data = response.body.data;
  return Boolean(data && typeof data === 'object' && 'revoked' in data && data.revoked === true);
}

function statesMatch(params: SsoStateValues): boolean {
  if (!params.returnedState || !params.storedState) return false;
  const returned = Buffer.from(params.returnedState);
  const stored = Buffer.from(params.storedState);
  return returned.length === stored.length && timingSafeEqual(returned, stored);
}

function readQueryValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function redirectToLogin(params: RedirectToLoginParams): void {
  const query = new URLSearchParams({ sso: params.status });
  if (params.nextPath) query.set('next', params.nextPath);
  params.response.redirect(302, `/login?${query.toString()}`);
}
