import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { InventoryItem } from '../types';

export const subscribeToInventory = (
  storeId: string,
  onData: (items: InventoryItem[]) => void,
  onError: (error: Error) => void
) => {
  const itemsRef = query(
    collection(db, `stores/${storeId}/items`),
    orderBy('name', 'asc')
  );

  return onSnapshot(itemsRef, (snapshot) => {
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as InventoryItem[];
    onData(items);
  }, onError);
};

export const addItem = async (storeId: string, item: Omit<InventoryItem, 'id'>) => {
  const itemsRef = collection(db, `stores/${storeId}/items`);
  return await addDoc(itemsRef, {
    ...item,
    updatedAt: new Date().toISOString()
  });
};

export const updateItem = async (storeId: string, itemId: string, data: Partial<InventoryItem>) => {
  const itemRef = doc(db, `stores/${storeId}/items`, itemId);
  return await updateDoc(itemRef, {
    ...data,
    updatedAt: new Date().toISOString()
  });
};

export const deleteItem = async (storeId: string, itemId: string) => {
  const itemRef = doc(db, `stores/${storeId}/items`, itemId);
  return await deleteDoc(itemRef);
};

export const resetInventory = async (storeId: string, items: InventoryItem[]) => {
  const promises = items.map(item => 
    updateDoc(doc(db, `stores/${storeId}/items`, item.id), { 
      quantity: 0, 
      waste: 0,
      updatedAt: new Date().toISOString()
    })
  );
  return await Promise.all(promises);
};
