import { collection, doc, query, where, getDocs, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { DailyChecklist } from '../types';

export const getChecklistsByStore = async (storeId: string) => {
  const checklistsRef = collection(db, `stores/${storeId}/checklists`);
  const snapshot = await getDocs(checklistsRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as DailyChecklist[];
};

export const subscribeToChecklists = (
  storeId: string,
  onData: (data: DailyChecklist[]) => void,
  onError: (error: Error) => void
) => {
  const q = query(
    collection(db, `stores/${storeId}/checklists`)
  );

  return onSnapshot(q, (snapshot) => {
    const lists = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DailyChecklist[];
    onData(lists);
  }, onError);
};

export const saveDailyChecklist = async (storeId: string, date: string, data: Partial<DailyChecklist>) => {
  const docRef = doc(db, `stores/${storeId}/checklists`, date);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } else {
    await setDoc(docRef, {
      ...data,
      storeId,
      date,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  return date;
};
