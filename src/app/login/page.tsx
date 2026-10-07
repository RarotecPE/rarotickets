import type { Metadata } from "next";
import { LoginPanel } from "@/components/login-panel";
import { validateInternalPath } from "@/server/auth/sso-url.util";

export const metadata: Metadata = { title: "Acesso da equipe" };
type LoginSearchParams = Promise<Record<string, string | string[] | undefined>>;
type LoginPageProps = { searchParams: LoginSearchParams };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const query = await searchParams;
  const reasonValue = query.reason;
  const nextValue = query.next;
  const revocationValue = query.revocation;
  const reason = Array.isArray(reasonValue) ? reasonValue[0] ?? null : reasonValue ?? null;
  const rawNextPath = Array.isArray(nextValue) ? nextValue[0] ?? "/painel" : nextValue ?? "/painel";
  const revocation = Array.isArray(revocationValue) ? revocationValue[0] ?? null : revocationValue ?? null;
  const nextPath = validateInternalPath(rawNextPath);
  return <LoginPanel reason={reason} nextPath={nextPath} revocation={revocation} />;
}
