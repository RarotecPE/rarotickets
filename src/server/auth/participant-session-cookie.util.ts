import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import { readEnvironment } from "@/server/config/environment.config";
import {
  PARTICIPANT_SESSION_MAX_AGE_SECONDS,
  verifyParticipantSessionToken,
  type ParticipantSessionPayload,
} from "./participant-session.service";

export const RAROTICKETS_PARTICIPANT_SESSION_COOKIE = "rarotickets_participant_session";

export function setParticipantSessionCookie(
  response: NextResponse,
  token: string,
): void {
  const environment = readEnvironment();
  response.cookies.set(RAROTICKETS_PARTICIPANT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: environment.nodeEnvironment === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PARTICIPANT_SESSION_MAX_AGE_SECONDS,
  });
}

export function clearParticipantSessionCookie(response: NextResponse): void {
  const environment = readEnvironment();
  response.cookies.set(RAROTICKETS_PARTICIPANT_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: environment.nodeEnvironment === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function getParticipantSessionFromRequest(
  request: NextRequest,
): ParticipantSessionPayload | null {
  const token = request.cookies.get(RAROTICKETS_PARTICIPANT_SESSION_COOKIE)?.value;
  return verifyParticipantSessionToken(token);
}

