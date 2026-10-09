"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  participantApi,
  type ParticipantProfile,
} from "@/client/services/participant-api.service";

export type ParticipantAuthContextValue = {
  participant: ParticipantProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
};

const ParticipantAuthContext = createContext<ParticipantAuthContextValue | null>(null);

export function ParticipantAuthProvider({ children }: { children: ReactNode }) {
  const [participant, setParticipant] = useState<ParticipantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const data = await participantApi.getSession();
      if (data.authenticated && data.participant) {
        setParticipant(data.participant);
      } else {
        setParticipant(null);
      }
    } catch {
      setParticipant(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await participantApi.logout();
    } finally {
      setParticipant(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchCurrentSession = async () => {
      try {
        const data = await participantApi.getSession();
        if (!active) return;
        setParticipant(data.authenticated && data.participant ? data.participant : null);
      } catch {
        if (active) setParticipant(null);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void fetchCurrentSession();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      participant,
      isAuthenticated: Boolean(participant),
      isLoading,
      refreshSession,
      logout,
    }),
    [participant, isLoading, refreshSession, logout],
  );

  return (
    <ParticipantAuthContext.Provider value={value}>
      {children}
    </ParticipantAuthContext.Provider>
  );
}

export function useParticipantAuth(): ParticipantAuthContextValue {
  const context = useContext(ParticipantAuthContext);
  if (!context) {
    throw new Error(
      "useParticipantAuth deve ser utilizado dentro de um ParticipantAuthProvider.",
    );
  }
  return context;
}

