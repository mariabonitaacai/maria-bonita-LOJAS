import { collection, onSnapshot, query, orderBy, addDoc, doc, writeBatch, getDocs, deleteDoc, updateDoc, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Store, User, Expense, Closing, CashSession } from '../types';

export const subscribeToAllStores = (onData: (stores: Store[]) => void) => {
  return onSnapshot(collection(db, 'stores'), (snapshot) => {
    onData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Store)));
  });
};

export const subscribeToAllUsers = (onData: (users: User[]) => void) => {
  return onSnapshot(collection(db, 'users'), (snapshot) => {
    onData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
  });
};

export const subscribeToStoreExpenses = (storeId: string, storeName: string, onData: (expenses: any[]) => void) => {
  const expensesRef = query(collection(db, `stores/${storeId}/expenses`), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(expensesRef, (snapshot) => {
    onData(snapshot.docs.map(doc => ({ id: doc.id, storeId, storeName, ...doc.data() })));
  });
};

export const subscribeToStoreClosings = (storeId: string, storeName: string, onData: (closings: any[]) => void) => {
  const closingsRef = query(collection(db, `stores/${storeId}/closings`), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(closingsRef, (snapshot) => {
    onData(snapshot.docs.map(doc => ({ id: doc.id, storeId, storeName, ...doc.data() })));
  });
};

export const subscribeToStoreSessions = (storeId: string, storeName: string, onData: (sessions: any[]) => void) => {
  const sessionsRef = query(collection(db, `stores/${storeId}/cashSessions`), orderBy('openedAt', 'desc'), limit(100));
  return onSnapshot(sessionsRef, (snapshot) => {
    onData(snapshot.docs.map(doc => ({ id: doc.id, storeId, storeName, ...doc.data() })));
  });
};

export const createStore = async (name: string, standardItems: { name: string, price: number }[]) => {
  const storeRef = await addDoc(collection(db, 'stores'), {
    name,
    createdAt: new Date().toISOString()
  });

  const batch = writeBatch(db);
  standardItems.forEach(item => {
    const itemRef = doc(collection(db, `stores/${storeRef.id}/items`));
    batch.set(itemRef, {
      name: item.name,
      quantity: 0,
      price: item.price,
      waste: 0,
      dailyConsumption: 0
    });
  });

  return await batch.commit();
};

export const deleteStore = async (storeId: string, users: User[]) => {
  // 1. Delete all items in the store
  const itemsSnapshot = await getDocs(collection(db, `stores/${storeId}/items`));
  const deletePromises = itemsSnapshot.docs.map(itemDoc => 
    deleteDoc(doc(db, `stores/${storeId}/items`, itemDoc.id))
  );
  await Promise.all(deletePromises);

  // 2. Unlink users associated with this store
  const usersToUpdate = users.filter(u => u.storeId === storeId);
  const userUpdatePromises = usersToUpdate.map(user => 
    updateDoc(doc(db, 'users', user.id), { storeId: null })
  );
  await Promise.all(userUpdatePromises);

  // 3. Delete the store itself
  return await deleteDoc(doc(db, 'stores', storeId));
};

export const updateUserRole = async (userId: string, role: string) => {
  return await updateDoc(doc(db, 'users', userId), { role });
};

export const updateUserStore = async (userId: string, storeId: string | null) => {
  return await updateDoc(doc(db, 'users', userId), { storeId });
};

export const updateExpense = async (storeId: string, expenseId: string, data: any) => {
  return await updateDoc(doc(db, `stores/${storeId}/expenses`, expenseId), data);
};

export const deleteExpense = async (storeId: string, expenseId: string) => {
  return await deleteDoc(doc(db, `stores/${storeId}/expenses`, expenseId));
};

export const updateClosing = async (storeId: string, closingId: string, data: any) => {
  return await updateDoc(doc(db, `stores/${storeId}/closings`, closingId), data);
};

export const deleteClosing = async (storeId: string, closingId: string) => {
  return await deleteDoc(doc(db, `stores/${storeId}/closings`, closingId));
};

export const updateSession = async (storeId: string, sessionId: string, data: any) => {
  return await updateDoc(doc(db, `stores/${storeId}/cashSessions`, sessionId), data);
};

export const deleteSession = async (storeId: string, sessionId: string) => {
  return await deleteDoc(doc(db, `stores/${storeId}/cashSessions`, sessionId));
};
