import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncRoute } from '../../../../../server/api/async-route.util';
import { clearCookie, readCookie, setSessionCookie } from '../../../../../server/api/cookies';
import { HttpResponse } from '../../../../../server/api/http-response';
import type { HttpResponseBody } from '../../../../../server/api/http-response';
import type { AppConfig } from '../../../../../server/config/app.config';
import { GetParticipantAccountController } from '../controllers/get-participant-account.controller';
import { LoginParticipantController } from '../controllers/login-participant.controller';
import { RegisterParticipantController } from '../controllers/register-participant.controller';
import { ParticipantSessionRegistry } from '../../infrastructure/session/participant-session.registry';
import type { LoginParticipantInputDto } from '../../../application/use-cases/login-participant/login-participant.input.dto';
import type { RegisterParticipantInputDto } from '../../../application/use-cases/register-participant/register-participant.input.dto';
import type { ParticipantDto } from '../../../application/types/participant.dto';

export const PARTICIPANT_SESSION_COOKIE = 'rarotickets_participant_session';

export type ParticipantAuthRouterDependencies = {
  config: AppConfig;
  registerParticipantController: RegisterParticipantController;
  loginParticipantController: LoginParticipantController;
  getParticipantAccountController: GetParticipantAccountController;
  sessionRegistry: ParticipantSessionRegistry;
};
type ParticipantAuthRequestParams = { request: Request; response: Response; dependencies: ParticipantAuthRouterDependencies };
type ParticipantAuthResponseParams = { response: Response; dependencies: ParticipantAuthRouterDependencies };
type SetParticipantSessionCookieParams = { response: Response; dependencies: ParticipantAuthRouterDependencies; result: HttpResponse };
type ClearParticipantSessionCookieParams = ParticipantAuthResponseParams & { token?: string };
type ReadTextParams = { value: unknown; maximumLength: number };
type ParticipantControllerSuccessBody = { data: { participant: ParticipantDto } };
type RecordValue = Record<string, unknown>;

export function createParticipantAuthRouter(dependencies: ParticipantAuthRouterDependencies): Router {
  const router = Router();
  router.post('/register', asyncRoute((request, response) => registerParticipant({ request, response, dependencies })));
  router.post('/login', asyncRoute((request, response) => loginParticipant({ request, response, dependencies })));
  router.get('/session', asyncRoute((request, response) => getParticipantSession({ request, response, dependencies })));
  router.post('/logout', asyncRoute((request, response) => logoutParticipant({ request, response, dependencies })));
  return router;
}

async function registerParticipant(params: ParticipantAuthRequestParams): Promise<void> {
  const input = parseRegisterParticipantRequest(params.request.body as unknown);
  if (!input) {
    sendInvalidRequest({ response: params.response, message: 'Revise o nome, e-mail, CPF e senha informados.' });
    return;
  }
  const result = await params.dependencies.registerParticipantController.handle(input);
  setParticipantSessionCookie({ response: params.response, dependencies: params.dependencies, result });
  params.response.status(result.statusCode).json(result.body);
}

async function loginParticipant(params: ParticipantAuthRequestParams): Promise<void> {
  const input = parseLoginParticipantRequest(params.request.body as unknown);
  if (!input) {
    sendInvalidRequest({ response: params.response, message: 'Informe um e-mail e uma senha válidos.' });
    return;
  }
  const result = await params.dependencies.loginParticipantController.handle(input);
  setParticipantSessionCookie({ response: params.response, dependencies: params.dependencies, result });
  params.response.status(result.statusCode).json(result.body);
}

function setParticipantSessionCookie(params: SetParticipantSessionCookieParams): void {
  if (params.result.statusCode < 200 || params.result.statusCode >= 300) return;
  if (!isParticipantControllerSuccessBody(params.result.body)) throw new Error('Resposta de conta de participante inválida.');
  const session = params.dependencies.sessionRegistry.create({
    participantId: params.result.body.data.participant.id,
    maxAgeSeconds: params.dependencies.config.participantSessionCookieMaxAgeSeconds,
  });
  setSessionCookie({
    response: params.response,
    config: params.dependencies.config,
    name: PARTICIPANT_SESSION_COOKIE,
    value: session.token,
    maxAgeSeconds: params.dependencies.config.participantSessionCookieMaxAgeSeconds,
  });
}

async function getParticipantSession(params: ParticipantAuthRequestParams): Promise<void> {
  params.response.setHeader('Cache-Control', 'no-store');
  const token = readCookie({ cookieHeader: params.request.headers.cookie, name: PARTICIPANT_SESSION_COOKIE });
  if (!token) {
    params.response.json({ data: { authenticated: false } });
    return;
  }
  const participantId = params.dependencies.sessionRegistry.resolve({ token });
  if (!participantId) {
    clearParticipantSessionCookie({ response: params.response, dependencies: params.dependencies, token });
    params.response.json({ data: { authenticated: false } });
    return;
  }
  const result = await params.dependencies.getParticipantAccountController.handle({ participantId });
  if (result.statusCode !== 200 || !isParticipantControllerSuccessBody(result.body)) {
    clearParticipantSessionCookie({ response: params.response, dependencies: params.dependencies, token });
    params.response.json({ data: { authenticated: false } });
    return;
  }
  params.response.json({ data: { authenticated: true, participant: result.body.data.participant } });
}

async function logoutParticipant(params: ParticipantAuthRequestParams): Promise<void> {
  const token = readCookie({ cookieHeader: params.request.headers.cookie, name: PARTICIPANT_SESSION_COOKIE });
  if (token) params.dependencies.sessionRegistry.revoke({ token });
  clearParticipantSessionCookie({ response: params.response, dependencies: params.dependencies });
  params.response.json({ data: { localSessionCleared: true } });
}

function clearParticipantSessionCookie(params: ClearParticipantSessionCookieParams): void {
  if (params.token) params.dependencies.sessionRegistry.revoke({ token: params.token });
  clearCookie({ response: params.response, config: params.dependencies.config, name: PARTICIPANT_SESSION_COOKIE });
}

function parseRegisterParticipantRequest(value: unknown): RegisterParticipantInputDto | null {
  if (!isRecord(value)) return null;
  const name = readText({ value: value.name, maximumLength: 120 });
  const email = readText({ value: value.email, maximumLength: 254 });
  const cpf = readText({ value: value.cpf, maximumLength: 32 });
  const password = readText({ value: value.password, maximumLength: 128 });
  if (!name || !email || !cpf || !password) return null;
  return { name, email, cpf, password };
}

function parseLoginParticipantRequest(value: unknown): LoginParticipantInputDto | null {
  if (!isRecord(value)) return null;
  const email = readText({ value: value.email, maximumLength: 254 });
  const password = readText({ value: value.password, maximumLength: 128 });
  return email && password ? { email, password } : null;
}

function readText(params: ReadTextParams): string | null {
  return typeof params.value === 'string'
    && params.value.length > 0
    && params.value.length <= params.maximumLength
    ? params.value
    : null;
}

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isParticipantControllerSuccessBody(body: HttpResponseBody): body is ParticipantControllerSuccessBody {
  if (!('data' in body) || !body.data || typeof body.data !== 'object' || !('participant' in body.data)) return false;
  const participant = body.data.participant;
  return Boolean(
    participant
    && typeof participant === 'object'
    && 'id' in participant
    && typeof participant.id === 'string'
    && 'name' in participant
    && typeof participant.name === 'string'
    && 'email' in participant
    && typeof participant.email === 'string'
    && 'cpfMasked' in participant
    && typeof participant.cpfMasked === 'string'
    && 'createdAt' in participant
    && typeof participant.createdAt === 'string',
  );
}

type SendInvalidRequestParams = { response: Response; message: string };

function sendInvalidRequest(params: SendInvalidRequestParams): void {
  params.response.status(400).json(HttpResponse.failure({
    statusCode: 400,
    code: 'INVALID_REQUEST',
    message: params.message,
  }).body);
}
