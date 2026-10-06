import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { participantAuthApiService } from '../../../../client/bootstrap/container';
import type { LoginParticipantRequest, ParticipantView, RegisterParticipantRequest } from '../types/participant.types';

export type ParticipantAuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'unavailable';
export type RefreshParticipantSession = () => Promise<void>;
export type RegisterParticipantAccount = (params: RegisterParticipantRequest) => Promise<void>;
export type LoginParticipantAccount = (params: LoginParticipantRequest) => Promise<void>;
export type LogoutParticipantAccount = () => Promise<void>;
export type ParticipantAuthContextValue = {
  status: ParticipantAuthStatus;
  participant: ParticipantView | null;
  refreshSession: RefreshParticipantSession;
  register: RegisterParticipantAccount;
  login: LoginParticipantAccount;
  logout: LogoutParticipantAccount;
};
export type ParticipantAuthProviderProps = PropsWithChildren;

const ParticipantAuthContext = createContext<ParticipantAuthContextValue | null>(null);

export function ParticipantAuthProvider(params: ParticipantAuthProviderProps) {
  const [status, setStatus] = useState<ParticipantAuthStatus>('loading');
  const [participant, setParticipant] = useState<ParticipantView | null>(null);

  const refreshSession: RefreshParticipantSession = async () => {
    setStatus('loading');
    try {
      const response = await participantAuthApiService.getSession();
      if (!response.data.authenticated || !response.data.participant) {
        setParticipant(null);
        setStatus('unauthenticated');
        return;
      }
      setParticipant(response.data.participant);
      setStatus('authenticated');
    } catch {
      setParticipant(null);
      setStatus('unavailable');
    }
  };

  useEffect(() => {
    void refreshSession();
  }, []);

  const register: RegisterParticipantAccount = async (input) => {
    const response = await participantAuthApiService.register(input);
    setParticipant(response.data.participant);
    setStatus('authenticated');
  };

  const login: LoginParticipantAccount = async (input) => {
    const response = await participantAuthApiService.login(input);
    setParticipant(response.data.participant);
    setStatus('authenticated');
  };

  const logout: LogoutParticipantAccount = async () => {
    try {
      await participantAuthApiService.logout();
    } finally {
      setParticipant(null);
      setStatus('unauthenticated');
    }
  };

  const contextValue = useMemo<ParticipantAuthContextValue>(() => ({
    status,
    participant,
    refreshSession,
    register,
    login,
    logout,
  }), [status, participant]);

  return <ParticipantAuthContext.Provider value={contextValue}>{params.children}</ParticipantAuthContext.Provider>;
}

export function useParticipantAuth(): ParticipantAuthContextValue {
  const context = useContext(ParticipantAuthContext);
  if (!context) throw new Error('useParticipantAuth precisa ser usado dentro de ParticipantAuthProvider.');
  return context;
}
