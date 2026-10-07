import { NextResponse } from "next/server";
import { nexusClient, RaroNexusClient } from "@/server/infrastructure/raronexus.client";
import { env } from "@/server/config/env";
import { consumeState, createLocalSession, validateNextUrl } from "@/server/session/session.service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const { state, next } = await consumeState();

  if (error || !code || !returnedState || returnedState !== state) {
    const loginUrl = new URL("/login", env.appBaseUrl);
    loginUrl.searchParams.set("error", "Falha na autenticação");
    return NextResponse.redirect(loginUrl.toString());
  }

  const redirectUri = `${env.appBaseUrl}/api/auth/raronexus/callback`;
  const tokenResp = await nexusClient.exchangeCode({ code, redirectUri });
  if (!tokenResp.success || !tokenResp.data) {
    const loginUrl = new URL("/login", env.appBaseUrl);
    loginUrl.searchParams.set("error", tokenResp.message ?? "Falha ao trocar código");
    return NextResponse.redirect(loginUrl.toString());
  }

  const data = tokenResp.data;
  if (!RaroNexusClient.isValidRole(data.role.chave)) {
    const loginUrl = new URL("/login", env.appBaseUrl);
    loginUrl.searchParams.set("error", "Perfil sem acesso ao sistema");
    return NextResponse.redirect(loginUrl.toString());
  }

  await createLocalSession({
    globalSessionToken: data.global_session_token,
    user: data.user,
    role: data.role,
  });

  return NextResponse.redirect(new URL(validateNextUrl(next), env.appBaseUrl));
}
