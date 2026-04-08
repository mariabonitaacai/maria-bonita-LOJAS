'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import Auth from '../components/Auth';
import AdminDashboard from '../components/AdminDashboard';
import Inventory from '../components/Inventory';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [storeName, setStoreName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        let userDoc = await getDoc(userDocRef);
        
        let currentData;
        if (!userDoc.exists()) {
          const isAdmin = currentUser.email === 'mariabonitaacai8@gmail.com';
          currentData = {
            email: currentUser.email,
            role: isAdmin ? 'admin' : 'store'
          };
          await setDoc(userDocRef, currentData);
        } else {
          currentData = userDoc.data();
        }
        setUserData(currentData);

        if (currentData.role === 'store' && currentData.storeId) {
          const storeDoc = await getDoc(doc(db, 'stores', currentData.storeId));
          if (storeDoc.exists()) {
            setStoreName(storeDoc.data().name);
          }
        }
      } else {
        setUserData(null);
        setStoreName('');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (userData?.role === 'admin') {
    if (selectedStore) {
      return <Inventory storeId={selectedStore.id} storeName={selectedStore.name} onBack={() => setSelectedStore(null)} />;
    }
    return <AdminDashboard onSelectStore={(id, name) => setSelectedStore({id, name})} />;
  }

  if (userData?.role === 'store') {
    if (!userData.storeId) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Aguardando Liberação</h2>
            <p className="text-gray-600 mb-6">Sua conta foi criada, mas você ainda não foi associado a nenhuma loja. Peça ao administrador para vincular sua conta a uma loja.</p>
            <button onClick={() => auth.signOut()} className="text-blue-600 hover:underline">Sair</button>
          </div>
        </div>
      );
    }
    return <Inventory storeId={userData.storeId} storeName={storeName || "Sua Loja"} />;
  }

  return <div>Erro de permissão.</div>;
}
