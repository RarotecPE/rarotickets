import { NextResponse } from "next/server";
import { clearSession } from "@/server/session/session.service";

export async function POST() {
  await clearSession();
  return NextResponse.json({ success: true });
}
