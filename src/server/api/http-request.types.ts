import type { Permission } from '@core/domain/permissions';

export type RequestActor = {
  userId: string;
  name: string;
  email: string;
  role: string;
  permissions: Permission[];
};

export type ParticipantActor = {
  participantId: string;
  name: string;
  email: string;
};

export type HttpRequestContext<
  Body = unknown,
  Params = Record<string, string>,
  Query = Record<string, unknown>,
> = {
  body: Body;
  params: Params;
  query: Query;
  actor: RequestActor | null;
  participant: ParticipantActor | null;
  ip: string | null;
  sessionToken?: string | null;
};
