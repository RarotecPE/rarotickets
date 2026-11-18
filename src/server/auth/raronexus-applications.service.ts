import "server-only";
import { readEnvironment } from "@/server/config/environment.config";

export type NexusApplication = { nome: string; client_id: string; logo_url: string | null; homepage_url: string };
export type ApplicationsResponse = { applications: NexusApplication[]; nexusProfileUrl: string };
export type ApplicationsServiceParams = { token: string };

export async function loadApplications(params: ApplicationsServiceParams): Promise<ApplicationsResponse> {
  const environment = readEnvironment();
  const upstream = await fetch(`${environment.raroNexusBaseUrl}/api/v1/applications`, {
    headers: { Cookie: `raronexus_global_session=${encodeURIComponent(params.token)}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const response: unknown = await upstream.json().catch(() => null);
  if (!upstream.ok || !isRecord(response) || response.success !== true || !Array.isArray(response.data)) throw new Error("Não foi possível carregar os aplicativos no RaroNexus.");
  const applications = response.data.map(parseApplication).filter((application): application is NexusApplication => Boolean(application))
    .filter((application) => application.client_id !== environment.raroNexusClientId && isSafeExternalUrl({ value: application.homepage_url, allowLocalHttp: environment.nodeEnvironment !== "production" }));
  const nexusApplication = applications.some((application) => application.nome.toLowerCase() === "raronexus") ? [] : [{ nome: "RaroNexus", client_id: "raronexus", logo_url: null, homepage_url: `${environment.raroNexusBaseUrl}/home` }];
  const finalApplications = [...applications, ...nexusApplication].filter((application) => isSafeExternalUrl({ value: application.homepage_url, allowLocalHttp: environment.nodeEnvironment !== "production" }));
  return { applications: finalApplications, nexusProfileUrl: `${environment.raroNexusBaseUrl}/profile` };
}

function parseApplication(value: unknown): NexusApplication | null {
  if (!isRecord(value) || value.ativo === false) return null;
  const name = readText(value.nome);
  const clientId = readText(value.client_id);
  const homepage = readText(value.homepage_url);
  if (!name || !clientId || !homepage) return null;
  const logoUrl = readText(value.logo_url);
  const launchUrl = resolveApplicationLaunchUrl({ client_id: clientId, homepage_url: homepage });
  return { nome: name, client_id: clientId, logo_url: logoUrl || null, homepage_url: launchUrl };
}

export function resolveApplicationLaunchUrl(application: { client_id: string; homepage_url: string }): string {
  if (!application.homepage_url) return "#";
  if (application.client_id === "raronexus") {
    try {
      return new URL("/home", application.homepage_url).toString();
    } catch {
      return application.homepage_url;
    }
  }

  try {
    const raw = new URL(application.homepage_url);
    const startUrl = new URL("/api/auth/raronexus/start", raw.origin);
    const nextPath = raw.pathname && raw.pathname !== "/"
      ? raw.pathname
      : (application.client_id.startsWith("rarotickets") ? "/painel" : "/dashboard");
    startUrl.searchParams.set("next", nextPath);
    return startUrl.toString();
  } catch {
    return application.homepage_url;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

type SafeUrlParams = { value: string; allowLocalHttp: boolean };
function isSafeExternalUrl(params: SafeUrlParams): boolean {
  try {
    const url = new URL(params.value);
    if (url.protocol === "https:") return true;
    return params.allowLocalHttp && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}
