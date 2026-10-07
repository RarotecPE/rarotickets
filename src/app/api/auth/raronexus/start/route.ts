import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { nexusClient } from "@/server/infrastructure/raronexus.client";
import { env } from "@/server/config/env";
import { setStateAndNext, validateNextUrl } from "@/server/session/session.service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = validateNextUrl(url.searchParams.get("next") ?? "/dashboard");
  const state = randomBytes(24).toString("hex");
  await setStateAndNext(state, next);
  const redirectUri = `${env.appBaseUrl}/api/auth/raronexus/callback`;
  const authUrl = nexusClient.getAuthorizeUrl({ state, redirectUri });
  return NextResponse.redirect(authUrl);
}
