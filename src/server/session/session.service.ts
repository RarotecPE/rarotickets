import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/server/config/env";
import { nexusClient } from "@/server/infrastructure/raronexus.client";
import type { SessionUser } from "@/lib/auth-types";
import { ROLE_LABELS } from "@/lib/auth-types";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

const COOKIE_NAME = "rarotickets_global_session";
const STATE_COOKIE = "rarotickets_sso_state";
const NEXT_COOKIE = "rarotickets_sso_next";

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(env.session.secret);
}

export async function createLocalSession(params: {
  globalSessionToken: string;
  user: { id: string; nome: string; email: string; avatar_url: string | null };
  role: { chave: import("@/lib/domain/types").UserRole; nome: string };
}): Promise<string> {
  // Garante que o usuário exista na base local.
  const existing = await db.select().from(users).where(eq(users.globalId, params.user.id)).limit(1);
  if (existing.length === 0) {
    const { Identifier } = await import("@/@core/domain/identifier");
    await db.insert(users).values({
      id: Identifier.create().toString(),
      globalId: params.user.id,
      name: params.user.nome,
      email: params.user.email,
      avatarUrl: params.user.avatar_url,
      role: params.role.chave,
    });
  } else {
    await db.update(users)
      .set({ name: params.user.nome, email: params.user.email, avatarUrl: params.user.avatar_url, role: params.role.chave, updatedAt: new Date() })
      .where(eq(users.globalId, params.user.id));
  }

  const token = await new SignJWT({
    sub: params.user.id,
    gtoken: params.globalSessionToken,
    email: params.user.email,
    name: params.user.nome,
    avatar: params.user.avatar_url,
    role: params.role.chave,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${env.session.days}d`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/",
    maxAge: env.session.days * 24 * 60 * 60,
  });
  return token;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const role = payload.role as SessionUser["role"];
    // Introspect no RaroNexus para garantir que a sessão ainda está ativa.
    const intro = await nexusClient.introspect(payload.gtoken as string);
    if (!intro.success || !intro.data?.active) {
      return null;
    }
    return {
      id: payload.sub as string,
      globalId: payload.sub as string,
      name: (intro.data.user.nome || (payload.name as string)) ?? "",
      email: intro.data.user.email ?? (payload.email as string) ?? "",
      avatarUrl: intro.data.user.avatar_url ?? (payload.avatar as string | null) ?? null,
      role: RaroNexusClient.isValidRole(intro.data.role.chave) ? intro.data.role.chave : role,
      label: ROLE_LABELS[role] ?? intro.data.role.nome ?? role,
    };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecretKey());
      if (payload.gtoken) {
        await nexusClient.revoke(payload.gtoken as string);
      }
    } catch {
      /* sessão inválida — limpa mesmo assim */
    }
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function setStateAndNext(state: string, next: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 5 * 60,
  });
  cookieStore.set(NEXT_COOKIE, next, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 5 * 60,
  });
}

export async function consumeState(): Promise<{ state: string | undefined; next: string | undefined }> {
  const cookieStore = await cookies();
  const state = cookieStore.get(STATE_COOKIE)?.value;
  const next = cookieStore.get(NEXT_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete(NEXT_COOKIE);
  return { state, next };
}

export function validateNextUrl(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

// Import needed here to avoid circular-reference typing issues
import { RaroNexusClient } from "@/server/infrastructure/raronexus.client";
