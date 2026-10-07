import { NextResponse } from "next/server";
import { getSession } from "@/server/session/session.service";
import { nexusClient } from "@/server/infrastructure/raronexus.client";
import { env } from "@/server/config/env";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const cookieStore = await cookies();
  const cookie = cookieStore.get("rarotickets_global_session")?.value;
  let globalToken = "";
  if (cookie) {
    try {
      const { payload } = await jwtVerify(cookie, new TextEncoder().encode(env.session.secret));
      globalToken = (payload.gtoken as string) ?? "";
    } catch {
      /* ignore */
    }
  }

  const apps = globalToken ? await nexusClient.listApplications(globalToken) : [];
  const nexusProfileUrl = `${env.raronexus.baseUrl}/profile`;
  return NextResponse.json({
    applications: apps,
    nexusProfileUrl,
  });
}
