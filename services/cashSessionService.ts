import { collection, doc, addDoc, updateDoc, onSnapshot, query, where, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { CashSession } from '../types';

export const subscribeToOpenSession = (
  storeId: string,
  onData: (session: CashSession | null) => void,
  onError: (error: Error) => void
) => {
  const sessionsRef = query(
    collection(db, `stores/${storeId}/cashSessions`),
    where('status', '==', 'open'),
    limit(1)
  );

  return onSnapshot(sessionsRef, (snapshot) => {
    if (!snapshot.empty) {
      onData({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as CashSession);
    } else {
      onData(null);
    }
  }, onError);
};

export const openSession = async (storeId: string, sessionData: Omit<CashSession, 'id' | 'status' | 'openedAt'>) => {
  const sessionsRef = collection(db, `stores/${storeId}/cashSessions`);
  return await addDoc(sessionsRef, {
    ...sessionData,
    status: 'open',
    openedAt: new Date().toISOString()
  });
};

export const closeSession = async (storeId: string, sessionId: string, closingData: Partial<CashSession>) => {
  const sessionRef = doc(db, `stores/${storeId}/cashSessions`, sessionId);
  return await updateDoc(sessionRef, {
    ...closingData,
    status: 'closed',
    closedAt: new Date().toISOString()
  });
};
