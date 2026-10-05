import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '@client/config/services';
import type { ConsentView, ParticipantView } from '@modules/participant/client/services/participant-api.service';

export type ParticipantContextValue = {
  participant: ParticipantView | null;
  consents: ConsentView[];
  isAuthenticated: boolean;
  isLoading: boolean;
  openSession: (params: { email?: string; cpf?: string }) => Promise<void>;
  closeSession: () => Promise<void>;
  updateProfile: (body: Partial<ParticipantView>) => Promise<void>;
  registerConsents: (consents: Array<{ type: string; version: string; accepted: boolean }>) => Promise<void>;
  refresh: () => Promise<void>;
};

const ParticipantContext = createContext<ParticipantContextValue | null>(null);

/** Sessão do participante (área do participante) — cookie próprio (§11). */
export function ParticipantProvider({ children }: { children: ReactNode }) {
  const [participant, setParticipant] = useState<ParticipantView | null>(null);
  const [consents, setConsents] = useState<ConsentView[]>([]);
  const [isLoading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const current = await api.participants.currentParticipant();
      setParticipant(current);
      setConsents(current.consents ?? []);
    } catch {
      setParticipant(null);
      setConsents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openSession = useCallback(async (params: { email?: string; cpf?: string }) => {
    const response = await api.participants.openSession(params);
    setParticipant(response.participant);
    setConsents(response.participant.consents ?? []);
  }, []);

  const closeSession = useCallback(async () => {
    await api.participants.closeSession();
    setParticipant(null);
    setConsents([]);
  }, []);

  const updateProfile = useCallback(async (body: Partial<ParticipantView>) => {
    const response = await api.participants.updateProfile(body);
    setParticipant(response.participant);
    setConsents(response.participant.consents ?? []);
  }, []);

  const registerConsents = useCallback(
    async (next: Array<{ type: string; version: string; accepted: boolean }>) => {
      const response = await api.participants.registerConsents(next);
      setConsents(response.consents ?? []);
    },
    [],
  );

  const value = useMemo<ParticipantContextValue>(
    () => ({
      participant,
      consents,
      isAuthenticated: participant !== null,
      isLoading,
      openSession,
      closeSession,
      updateProfile,
      registerConsents,
      refresh,
    }),
    [participant, consents, isLoading, openSession, closeSession, updateProfile, registerConsents, refresh],
  );

  return <ParticipantContext.Provider value={value}>{children}</ParticipantContext.Provider>;
}

export function useParticipant(): ParticipantContextValue {
  const context = useContext(ParticipantContext);
  if (!context) throw new Error('useParticipant deve ser usado dentro de ParticipantProvider');
  return context;
}
