import { createHash, randomBytes } from 'node:crypto';

export type CreateParticipantSessionParams = { participantId: string; maxAgeSeconds: number };
export type CreateParticipantSessionOutput = { token: string; expiresAt: Date };
export type ResolveParticipantSessionParams = { token: string };
export type RevokeParticipantSessionParams = { token: string };
type ParticipantSessionRecord = { participantId: string; expiresAt: number };
type ParticipantSessionToken = string;

export class ParticipantSessionRegistry {
  private readonly sessions = new Map<string, ParticipantSessionRecord>();

  create(params: CreateParticipantSessionParams): CreateParticipantSessionOutput {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + params.maxAgeSeconds * 1000;
    this.removeExpiredSessions();
    this.sessions.set(this.hashToken({ token }), { participantId: params.participantId, expiresAt });
    return { token, expiresAt: new Date(expiresAt) };
  }

  resolve(params: ResolveParticipantSessionParams): string | null {
    if (!params.token || params.token.length > 128) return null;
    const tokenHash = this.hashToken({ token: params.token });
    const session = this.sessions.get(tokenHash);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(tokenHash);
      return null;
    }
    return session.participantId;
  }

  revoke(params: RevokeParticipantSessionParams): void {
    if (!params.token || params.token.length > 128) return;
    this.sessions.delete(this.hashToken({ token: params.token }));
  }

  private hashToken(params: HashParticipantSessionTokenParams): string {
    return createHash('sha256').update(params.token).digest('hex');
  }

  private removeExpiredSessions(): void {
    const now = Date.now();
    for (const [tokenHash, session] of this.sessions) {
      if (session.expiresAt <= now) this.sessions.delete(tokenHash);
    }
  }
}

type HashParticipantSessionTokenParams = { token: ParticipantSessionToken };
