import { useState, useEffect } from 'react';
import { Store, User } from '../types';
import * as adminService from '../services/adminService';

export const useAdmin = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [expensesByStore, setExpensesByStore] = useState<Record<string, any[]>>({});
  const [closingsByStore, setClosingsByStore] = useState<Record<string, any[]>>({});
  const [sessionsByStore, setSessionsByStore] = useState<Record<string, any[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubStores = adminService.subscribeToAllStores((data) => {
      setStores(data);
      setIsLoading(false);
    });

    const unsubUsers = adminService.subscribeToAllUsers((data) => {
      setUsers(data);
    });

    return () => {
      unsubStores();
      unsubUsers();
    };
  }, []);

  useEffect(() => {
    if (stores.length === 0) return;

    const unsubscribes: (() => void)[] = [];

    stores.forEach(store => {
      const unsubExp = adminService.subscribeToStoreExpenses(store.id, store.name, (data) => {
        setExpensesByStore(prev => ({ ...prev, [store.id]: data }));
      });
      unsubscribes.push(unsubExp);

      const unsubClos = adminService.subscribeToStoreClosings(store.id, store.name, (data) => {
        setClosingsByStore(prev => ({ ...prev, [store.id]: data }));
      });
      unsubscribes.push(unsubClos);

      const unsubSess = adminService.subscribeToStoreSessions(store.id, store.name, (data) => {
        setSessionsByStore(prev => ({ ...prev, [store.id]: data }));
      });
      unsubscribes.push(unsubSess);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [stores]);

  return {
    stores,
    users,
    expensesByStore,
    closingsByStore,
    sessionsByStore,
    isLoading,
    createStore: adminService.createStore,
    deleteStore: (storeId: string) => adminService.deleteStore(storeId, users),
    updateUserRole: adminService.updateUserRole,
    updateUserStore: adminService.updateUserStore,
    updateExpense: adminService.updateExpense,
    deleteExpense: adminService.deleteExpense,
    updateClosing: adminService.updateClosing,
    deleteClosing: adminService.deleteClosing,
    updateSession: adminService.updateSession,
    deleteSession: adminService.deleteSession
  };
};
