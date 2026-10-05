import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '@client/config/services';
import type { AuthUser } from '@modules/auth/client/services/auth-api.service';
import type { Permission } from '@core/domain/permissions';

export type SessionStatus = 'loading' | 'anonymous' | 'authenticated';
export type SessionContextValue = {
  status: SessionStatus;
  user: AuthUser | null;
  can: (permission: Permission) => boolean;
  login: (params: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/** Sessão do usuário interno; as permissões vêm do servidor (§35). */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await api.auth.currentUser();
      setUser(response.user);
      setStatus('authenticated');
    } catch {
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (params: { email: string; password: string }) => {
    const response = await api.auth.login(params);
    setUser(response.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setUser(null);
    setStatus('anonymous');
  }, []);

  const can = useCallback(
    (permission: Permission) => user?.permissions.includes(permission) ?? false,
    [user],
  );

  const value = useMemo<SessionContextValue>(
    () => ({ status, user, can, login, logout, refresh }),
    [status, user, can, login, logout, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession deve ser usado dentro de SessionProvider');
  return context;
}
