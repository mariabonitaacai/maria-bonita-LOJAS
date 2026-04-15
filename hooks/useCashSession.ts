import { useState, useEffect } from 'react';
import { CashSession } from '../types';
import * as cashSessionService from '../services/cashSessionService';

export const useCashSession = (storeId: string | null) => {
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) {
      return;
    }

    const unsubscribe = cashSessionService.subscribeToOpenSession(
      storeId,
      (session) => {
        setCurrentSession(session);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching open session:", err);
        setError("Erro ao carregar sessão de caixa.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [storeId]);

  const openSession = async (sessionData: Omit<CashSession, 'id' | 'status' | 'openedAt' | 'storeId'>) => {
    if (!storeId) throw new Error("Store ID is required");
    return cashSessionService.openSession(storeId, {
      ...sessionData,
      storeId
    });
  };

  const closeSession = async (sessionId: string, closingData: Partial<CashSession>) => {
    if (!storeId) throw new Error("Store ID is required");
    return cashSessionService.closeSession(storeId, sessionId, closingData);
  };

  return {
    currentSession,
    isLoading,
    error,
    openSession,
    closeSession
  };
};
