import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, writeBatch, getDocs, where } from 'firebase/firestore';
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

export const transferItem = async (
  sourceStoreId: string,
  sourceStoreName: string,
  destStoreId: string,
  destStoreName: string,
  item: InventoryItem,
  quantity: number,
  userId: string
) => {
  const batch = writeBatch(db);

  // 1. Deduct from source
  const sourceItemRef = doc(db, `stores/${sourceStoreId}/items`, item.id);
  batch.update(sourceItemRef, {
    quantity: Math.max(0, item.quantity - quantity),
    updatedAt: new Date().toISOString()
  });

  // 2. Find or create in destination
  const destItemsRef = collection(db, `stores/${destStoreId}/items`);
  const q = query(destItemsRef, where('name', '==', item.name));
  const destSnapshot = await getDocs(q);

  if (!destSnapshot.empty) {
    // Update existing
    const destItemDoc = destSnapshot.docs[0];
    const destItemRef = doc(db, `stores/${destStoreId}/items`, destItemDoc.id);
    batch.update(destItemRef, {
      quantity: destItemDoc.data().quantity + quantity,
      updatedAt: new Date().toISOString()
    });
  } else {
    // Create new
    const newDestItemRef = doc(destItemsRef);
    batch.set(newDestItemRef, {
      name: item.name,
      category: item.category || '',
      quantity: quantity,
      minQuantity: item.minQuantity || 0,
      price: item.price || 0,
      dailyConsumption: item.dailyConsumption || 0,
      waste: 0,
      updatedAt: new Date().toISOString()
    });
  }

  // 3. Record transfer
  const transferRef = doc(collection(db, 'transfers'));
  batch.set(transferRef, {
    fromStoreId: sourceStoreId,
    fromStoreName: sourceStoreName,
    toStoreId: destStoreId,
    toStoreName: destStoreName,
    itemId: item.id,
    itemName: item.name,
    quantity: quantity,
    date: new Date().toISOString(),
    transferredBy: userId
  });

  return await batch.commit();
};
