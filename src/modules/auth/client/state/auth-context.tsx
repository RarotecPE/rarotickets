import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { ApiClientError } from '../../../../client/services/api-service.base';
import { authApiService } from '../../../../client/bootstrap/container';
import type { AuthSessionView } from '../types/auth.types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'forbidden' | 'unavailable';

export type RefreshAuthSession = () => Promise<void>;
export type StartDemoLogin = () => Promise<void>;
export type LogoutAuthSession = () => Promise<boolean>;

export type AuthContextValue = {
  status: AuthStatus;
  session: AuthSessionView | null;
  demo: boolean;
  raronexusConfigured: boolean;
  demoLoginEnabled: boolean;
  raronexusHomeUrl: string | null;
  raronexusProfileUrl: string | null;
  refreshSession: RefreshAuthSession;
  loginDemo: StartDemoLogin;
  logout: LogoutAuthSession;
};

export type AuthProviderProps = PropsWithChildren;

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider(params: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<AuthSessionView | null>(null);
  const [demo, setDemo] = useState(false);
  const [raronexusConfigured, setRaronexusConfigured] = useState(false);
  const [demoLoginEnabled, setDemoLoginEnabled] = useState(false);
  const [raronexusHomeUrl, setRaronexusHomeUrl] = useState<string | null>(null);
  const [raronexusProfileUrl, setRaronexusProfileUrl] = useState<string | null>(null);

  const refreshSession = async (): Promise<void> => {
    setStatus('loading');
    try {
      const statusResponse = await authApiService.getStatus();
      setRaronexusConfigured(statusResponse.data.raronexusConfigured);
      setDemoLoginEnabled(statusResponse.data.demoLoginEnabled);
      setRaronexusHomeUrl(statusResponse.data.raronexusHomeUrl);
      setRaronexusProfileUrl(statusResponse.data.raronexusProfileUrl);
    } catch {
      setSession(null);
      setDemo(false);
      setStatus('unavailable');
      return;
    }

    try {
      const sessionResponse = await authApiService.getSession();
      if (!sessionResponse.data.authenticated || !sessionResponse.data.session) {
        setSession(null);
        setDemo(false);
        setStatus('unauthenticated');
        return;
      }
      setSession(sessionResponse.data.session);
      setDemo(sessionResponse.data.demo === true);
      setStatus(sessionResponse.data.authorized ? 'authenticated' : 'forbidden');
    } catch (error) {
      setSession(null);
      setDemo(false);
      if (error instanceof ApiClientError && error.statusCode === 401) {
        setStatus('unauthenticated');
        return;
      }
      if (error instanceof ApiClientError && error.statusCode === 403) {
        setStatus('forbidden');
        return;
      }
      setStatus('unavailable');
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  const loginDemo = async (): Promise<void> => {
    const response = await authApiService.startDemo();
    setSession(response.data.session ?? null);
    setDemo(response.data.demo === true);
    setStatus(response.data.authenticated && response.data.authorized ? 'authenticated' : 'unauthenticated');
  };

  const logout = async (): Promise<boolean> => {
    let globalSessionRevoked = false;
    try {
      const response = await authApiService.logout();
      globalSessionRevoked = response.data.globalSessionRevoked;
    } finally {
      setSession(null);
      setDemo(false);
      setStatus('unauthenticated');
    }
    return globalSessionRevoked;
  };

  const value = useMemo<AuthContextValue>(() => ({
    status,
    session,
    demo,
    raronexusConfigured,
    demoLoginEnabled,
    raronexusHomeUrl,
    raronexusProfileUrl,
    refreshSession,
    loginDemo,
    logout,
  }), [status, session, demo, raronexusConfigured, demoLoginEnabled, raronexusHomeUrl, raronexusProfileUrl]);

  return <AuthContext.Provider value={value}>{params.children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth precisa ser usado dentro de AuthProvider.');
  return context;
}
