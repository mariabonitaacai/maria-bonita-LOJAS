import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Order } from '../types';

export const subscribeToOrders = (
  storeId: string,
  onData: (orders: Order[]) => void,
  onError: (error: Error) => void
) => {
  const q = query(
    collection(db, `stores/${storeId}/orders`),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Order[];
    onData(orders);
  }, onError);
};

export const createOrder = async (storeId: string, order: Omit<Order, 'id'>) => {
  const ordersRef = collection(db, `stores/${storeId}/orders`);
  return await addDoc(ordersRef, {
    ...order,
    createdAt: new Date().toISOString()
  });
};

export const updateOrderStatus = async (storeId: string, orderId: string, status: Order['status'], userId: string) => {
  const orderRef = doc(db, `stores/${storeId}/orders`, orderId);
  return await updateDoc(orderRef, {
    status,
    updatedAt: new Date().toISOString(),
    updatedBy: userId
  });
};

export const deleteOrder = async (storeId: string, orderId: string) => {
  const orderRef = doc(db, `stores/${storeId}/orders`, orderId);
  return await deleteDoc(orderRef);
};
