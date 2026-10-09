import "server-only";
import { readEnvironment } from "@/server/config/environment.config";

interface CachedConstant<T> {
  data: T;
  etag: string;
  version: number;
  lastChecked: number;
}

const memoryCache = new Map<string, CachedConstant<unknown>>();

export interface FetchConstantOptions {
  name: string;
  isPrivate?: boolean;
  token?: string;
  /** Tempo mínimo em ms antes de revalidar com o servidor (ex: 60_000 = 1 min). Padrão: 30s */
  cacheTtlMs?: number;
}

export type RaroNexusConstantsClientDependencies = {
  baseUrl?: string;
  sessionToken?: string;
};

type NexusConstantErrorEnvelope = {
  success?: boolean;
  message?: string;
  code?: string;
};

export class RaroNexusConstantsClient {
  private readonly baseUrl?: string;
  private readonly sessionToken?: string;

  constructor(dependencies?: RaroNexusConstantsClientDependencies) {
    this.baseUrl = dependencies?.baseUrl;
    this.sessionToken = dependencies?.sessionToken;
  }

  async get<T = unknown>(options: FetchConstantOptions): Promise<T> {
    const { name, isPrivate = false, token, cacheTtlMs = 30_000 } = options;
    const environment = readEnvironment();
    const baseUrl = (this.baseUrl || environment.raroNexusApiUrl || environment.raroNexusBaseUrl).replace(/\/$/, "");

    if (!baseUrl) {
      throw new Error("Variável RARONEXUS_API_URL não configurada.");
    }

    validateConstantName(name);

    const cached = memoryCache.get(name) as CachedConstant<T> | undefined;
    const now = Date.now();

    if (cached && now - cached.lastChecked < cacheTtlMs) {
      return cached.data;
    }

    const url = `${baseUrl}/api/constants/${encodeURIComponent(name)}`;
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    const authToken = token || this.sessionToken || (isPrivate ? environment.raroNexusSessionToken : undefined);
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    } else if (isPrivate) {
      throw new Error(
        `A constante '${name}' é privada, mas nenhum token de autenticação foi fornecido.`
      );
    }

    if (cached?.etag) {
      headers["If-None-Match"] = cached.etag;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
      redirect: "follow",
    });

    if (response.status === 304 && cached) {
      cached.lastChecked = now;
      return cached.data;
    }

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as NexusConstantErrorEnvelope | null;
      const code = errorBody?.code || `HTTP_${response.status}`;
      const message = errorBody?.message || response.statusText;
      throw new Error(`[RaroNexus Constants Error] [${code}] ${message}`);
    }

    const newEtag = response.headers.get("ETag") || "";
    const version = Number(response.headers.get("X-Constant-Version") || "1");
    const data = (await response.json()) as T;

    memoryCache.set(name, {
      data,
      etag: newEtag,
      version,
      lastChecked: now,
    });

    return data;
  }

  clearCache(name?: string): void {
    if (name) {
      memoryCache.delete(name);
    } else {
      memoryCache.clear();
    }
  }
}

export const defaultConstantsClient = new RaroNexusConstantsClient();

export async function getRaroConstant<T = unknown>(options: FetchConstantOptions): Promise<T> {
  return defaultConstantsClient.get<T>(options);
}

export function clearConstantCache(name?: string): void {
  defaultConstantsClient.clearCache(name);
}

function validateConstantName(name: string): void {
  if (name === "content" || name === "_content") {
    throw new Error(`O nome '${name}' é reservado e não pode ser utilizado como constante.`);
  }
  if (!/^[a-z0-9][a-z0-9_.-]{1,79}$/.test(name)) {
    throw new Error(
      `O nome da constante '${name}' é inválido. Deve conter entre 2 e 80 caracteres (apenas letras minúsculas, números, ponto, hífen e underline).`
    );
  }
}

