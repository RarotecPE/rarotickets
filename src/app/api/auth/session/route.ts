import { NextResponse } from "next/server";
import { getSession } from "@/server/session/session.service";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({ authenticated: true, user });
}
