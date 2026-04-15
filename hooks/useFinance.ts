import { useState, useEffect } from 'react';
import { Expense, Closing } from '../types';
import * as financeService from '../services/financeService';

export const useFinance = (storeId: string | null, limitCount?: number) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [closings, setClosings] = useState<Closing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) {
      return;
    }

    const unsubscribeExpenses = financeService.subscribeToExpenses(
      storeId,
      (data) => {
        setExpenses(data);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching expenses:", err);
        setError("Erro ao carregar despesas.");
        setIsLoading(false);
      },
      limitCount
    );

    const unsubscribeClosings = financeService.subscribeToClosings(
      storeId,
      (data) => setClosings(data),
      (err) => {
        console.error("Error fetching closings:", err);
        setError("Erro ao carregar fechamentos.");
      },
      limitCount
    );

    return () => {
      unsubscribeExpenses();
      unsubscribeClosings();
    };
  }, [storeId, limitCount]);

  const addExpense = async (expenseData: Omit<Expense, 'id' | 'createdAt'>) => {
    if (!storeId) throw new Error("Store ID is required");
    return financeService.addExpense(storeId, {
      ...expenseData,
      createdAt: new Date().toISOString()
    });
  };

  const updateExpense = async (expenseId: string, data: Partial<Expense>) => {
    if (!storeId) throw new Error("Store ID is required");
    return financeService.updateExpense(storeId, expenseId, data);
  };

  const deleteExpense = async (expenseId: string) => {
    if (!storeId) throw new Error("Store ID is required");
    return financeService.deleteExpense(storeId, expenseId);
  };

  const addClosing = async (closingData: Omit<Closing, 'id' | 'createdAt'>) => {
    if (!storeId) throw new Error("Store ID is required");
    return financeService.addClosing(storeId, {
      ...closingData,
      createdAt: new Date().toISOString()
    });
  };

  const updateClosing = async (closingId: string, data: Partial<Closing>) => {
    if (!storeId) throw new Error("Store ID is required");
    return financeService.updateClosing(storeId, closingId, data);
  };

  const deleteClosing = async (closingId: string) => {
    if (!storeId) throw new Error("Store ID is required");
    return financeService.deleteClosing(storeId, closingId);
  };

  return {
    expenses,
    closings,
    isLoading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    addClosing,
    updateClosing,
    deleteClosing
  };
};
