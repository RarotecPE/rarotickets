"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi, type ClientAuthSession, type LogoutResponse } from "@/client/services/auth-api.service";
import { ApiError } from "@/client/services/api-service.base";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";
export type AuthContextValue = { status: AuthStatus; session: ClientAuthSession | null; error: string | null; refreshSession: () => Promise<void>; logout: () => Promise<LogoutResponse> };
export type AuthProviderProps = { children: ReactNode };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<ClientAuthSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    try {
      const nextSession = await authApi.getSession();
      setSession(nextSession);
      setStatus("authenticated");
      setError(null);
    } catch (caught) {
      setSession(null);
      setStatus(caught instanceof ApiError && caught.status === 401 ? "unauthenticated" : "error");
      setError(caught instanceof Error ? caught.message : "Não foi possível validar sua sessão.");
    }
  }, []);

  const refreshSession = useCallback(async () => {
    setStatus("loading");
    setError(null);
    await loadSession();
  }, [loadSession]);

  const logout = useCallback(async (): Promise<LogoutResponse> => {
    try {
      const result = await authApi.logout();
      setSession(null);
      setStatus("unauthenticated");
      return result;
    } catch {
      setSession(null);
      setStatus("unauthenticated");
      return { localSessionCleared: true, globalRevocationConfirmed: false };
    }
  }, []);

  useEffect(() => {
    let active = true;
    void authApi.getSession().then((nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setStatus("authenticated");
      setError(null);
    }).catch((caught: unknown) => {
      if (!active) return;
      setSession(null);
      setStatus(caught instanceof ApiError && caught.status === 401 ? "unauthenticated" : "error");
      setError(caught instanceof Error ? caught.message : "Não foi possível validar sua sessão.");
    });
    return () => { active = false; };
  }, []);
  const value = useMemo(() => ({ status, session, error, refreshSession, logout }), [status, session, error, refreshSession, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return context;
}
