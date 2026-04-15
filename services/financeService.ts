import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, Timestamp, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Expense, Closing } from '../types';

// --- EXPENSES ---

export const subscribeToExpenses = (
  storeId: string, 
  onData: (expenses: Expense[]) => void,
  onError: (error: Error) => void,
  limitCount?: number
) => {
  let expensesQuery = query(
    collection(db, `stores/${storeId}/expenses`),
    orderBy('createdAt', 'desc')
  );
  
  if (limitCount) {
    expensesQuery = query(expensesQuery, limit(limitCount));
  }

  return onSnapshot(expensesQuery, (snapshot) => {
    const expenses = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Expense[];
    onData(expenses);
  }, onError);
};

export const addExpense = async (storeId: string, expense: Omit<Expense, 'id'>) => {
  const expensesRef = collection(db, `stores/${storeId}/expenses`);
  return await addDoc(expensesRef, {
    ...expense,
    createdAt: new Date().toISOString()
  });
};

export const updateExpense = async (storeId: string, expenseId: string, data: Partial<Expense>) => {
  const expenseRef = doc(db, `stores/${storeId}/expenses`, expenseId);
  return await updateDoc(expenseRef, {
    ...data,
    updatedAt: new Date().toISOString()
  });
};

export const deleteExpense = async (storeId: string, expenseId: string) => {
  const expenseRef = doc(db, `stores/${storeId}/expenses`, expenseId);
  return await deleteDoc(expenseRef);
};

// --- CLOSINGS ---

export const subscribeToClosings = (
  storeId: string, 
  onData: (closings: Closing[]) => void,
  onError: (error: Error) => void,
  limitCount?: number
) => {
  let closingsQuery = query(
    collection(db, `stores/${storeId}/closings`),
    orderBy('createdAt', 'desc')
  );
  
  if (limitCount) {
    closingsQuery = query(closingsQuery, limit(limitCount));
  }

  return onSnapshot(closingsQuery, (snapshot) => {
    const closings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Closing[];
    onData(closings);
  }, onError);
};

export const addClosing = async (storeId: string, closing: Omit<Closing, 'id'>) => {
  const closingsRef = collection(db, `stores/${storeId}/closings`);
  return await addDoc(closingsRef, {
    ...closing,
    createdAt: new Date().toISOString()
  });
};

export const updateClosing = async (storeId: string, closingId: string, data: Partial<Closing>) => {
  const closingRef = doc(db, `stores/${storeId}/closings`, closingId);
  return await updateDoc(closingRef, {
    ...data,
    updatedAt: new Date().toISOString()
  });
};

export const deleteClosing = async (storeId: string, closingId: string) => {
  const closingRef = doc(db, `stores/${storeId}/closings`, closingId);
  return await deleteDoc(closingRef);
};
