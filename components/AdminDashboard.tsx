import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Store, Plus, LogOut, ChevronRight, Users, UserCheck, ShieldCheck, Trash2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminDashboard({ onSelectStore }: { onSelectStore: (storeId: string, storeName: string) => void }) {
  const [stores, setStores] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [newStoreName, setNewStoreName] = useState('');
  const [activeTab, setActiveTab] = useState<'stores' | 'users'>('stores');
  const [notification, setNotification] = useState<string | null>(null);
  const [storeToDelete, setStoreToDelete] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    const unsubscribeStores = onSnapshot(collection(db, 'stores'), (snapshot) => {
      setStores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeStores();
      unsubscribeUsers();
    };
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;
    try {
      const storeRef = await addDoc(collection(db, 'stores'), {
        name: newStoreName,
        createdAt: new Date().toISOString()
      });

      const batch = writeBatch(db);
      const standardItems = [
        { name: 'Amendoim Triturado', price: 0 },
        { name: 'Bala Docile 1kg Amora', price: 34.5 },
        { name: 'Bala Docile 1kg Bananinha', price: 34.5 },
        { name: 'Bala Docile 1kg Beijinho', price: 34.5 },
        { name: 'Bala Docile 1kg Dentadura', price: 34.5 },
        { name: 'Bala Docile 1kg Minhocas Cítricas', price: 34.5 },
        { name: 'Bandeira de morango', price: 7.25 },
        { name: 'Base M500 ml com 50 un', price: 9.5 },
        { name: 'CAIXAS DE AÇAÍ FIT ULTRA', price: 85 },
        { name: 'Caixas de Açaí Premium de 4kg', price: 75 },
        { name: 'Canudos waffle 1kg', price: 27.6 },
        { name: 'Cascão de Sorverte com', price: 0 },
        { name: 'Castanha Caramelizada 1kg', price: 0 },
        { name: 'Castanhas em Bandas 1kg', price: 44.99 },
        { name: 'Cereja Cerelis Alispec 4,5 Kg', price: 92.99 },
        { name: 'Cestinha de Sorverte', price: 0 },
        { name: 'Chocoball Dona Jura 500 kg', price: 16.5 },
        { name: 'Chococandy Dori 500g', price: 12.49 },
        { name: 'ChocoCookies Ao Leite Food Base 4kg', price: 126.49 },
        { name: 'ChocoCookies Branco Food Base 4Kg', price: 122.42 },
        { name: 'Chocopower Dona Jura 500 kg', price: 0 },
        { name: 'Cobertura de chocolate 1kg', price: 28.99 },
        { name: 'Cobertura de morango 1kg', price: 28.99 },
        { name: 'Cobertura fine bananinha 1kg', price: 28.99 },
        { name: 'Cobertura fine beijo 1kg', price: 28.99 },
        { name: 'Cobertura fine Dentadura 1kg', price: 28.99 },
        { name: 'Colher Reforçada Real Açaí Lilás', price: 34.99 },
        { name: 'Composto Lácteo Piracanjuba Ótimo 1kg', price: 30.49 },
        { name: 'Cookies Branco Doremus 4kg', price: 127.49 },
        { name: 'Copos de 400 ml Cristal', price: 7.49 },
        { name: 'Creme de Amendoim specialita 1kg', price: 0 },
        { name: 'Creme de Dorella Doremus 4 Kg', price: 161.49 },
        { name: 'Creme de Leite Culinário 200g', price: 2 },
        { name: 'Creme de Pipoca Specialita3,5', price: 0 },
        { name: 'Creme De Pistache Doremus 4kg', price: 0 },
        { name: 'Detergente para louça', price: 1.5 },
        { name: 'Emulsificante de 1kg', price: 21.99 },
        { name: 'Gotas de Chocolate 1kg (Marcas variadas)', price: 0 },
        { name: 'Granola Sabor Da Terra 1kg', price: 14 },
        { name: 'Jujuba docile de 1kg', price: 13 },
        { name: 'Kiwi frita kg', price: 23 },
        { name: 'Leite Condensado Mistura L 395g', price: 4 },
        { name: 'Leite em pó Piracanjuba ótimo 2kg', price: 31.3 },
        { name: 'Marshmallow Docile 0,220 g', price: 0 },
        { name: 'Ovomaltine Em Pasta 900g', price: 37.5 },
        { name: 'Ovomaltine Em pó 750kg', price: 37.5 },
        { name: 'Paçoquita', price: 11.66 },
        { name: 'Potes Personalizados de 500ml', price: 0.89 },
        { name: 'Preparo de Abacaxi Ao Vinho 4kg', price: 99 },
        { name: 'Preparo de maracujá 1kg', price: 99 },
        { name: 'Preparo de maracujá 4kg', price: 99 },
        { name: 'Preparo de morango 4kg', price: 99 },
        { name: 'Sucrilhos de 1kg', price: 22.49 },
        { name: 'Tampa da base M500 ml com 50 un', price: 9.5 }
      ];

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

      await batch.commit();

      setNewStoreName('');
      showNotification('Loja criada com sucesso (com estoque padrão)!');
    } catch (error) {
      console.error("Error adding store:", error);
    }
  };

  const handleDeleteStore = async () => {
    if (!storeToDelete) return;
    
    try {
      // 1. Delete all items in the store
      const itemsSnapshot = await getDocs(collection(db, `stores/${storeToDelete.id}/items`));
      const deletePromises = itemsSnapshot.docs.map(itemDoc => 
        deleteDoc(doc(db, `stores/${storeToDelete.id}/items`, itemDoc.id))
      );
      await Promise.all(deletePromises);

      // 2. Unlink users associated with this store
      const usersToUpdate = users.filter(u => u.storeId === storeToDelete.id);
      const userUpdatePromises = usersToUpdate.map(user => 
        updateDoc(doc(db, 'users', user.id), { storeId: null })
      );
      await Promise.all(userUpdatePromises);

      // 3. Delete the store itself
      await deleteDoc(doc(db, 'stores', storeToDelete.id));
      
      showNotification(`Loja "${storeToDelete.name}" excluída com sucesso!`);
      setStoreToDelete(null);
    } catch (error) {
      console.error("Error deleting store:", error);
      showNotification('Erro ao excluir a loja.');
    }
  };

  const assignUserToStore = async (userId: string, storeId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        storeId: storeId
      });
      showNotification('Usuário vinculado à loja!');
    } catch (error) {
      console.error("Error assigning user:", error);
    }
  };

  const changeUserRole = async (userId: string, newRole: 'admin' | 'store') => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });
      showNotification('Cargo do usuário atualizado!');
    } catch (error) {
      console.error("Error changing role:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-10">
      <header className="bg-blue-600 text-white p-6 shadow-md rounded-b-2xl mb-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck size={32} />
            <div>
              <h1 className="text-2xl font-bold">Painel Master</h1>
              <p className="text-blue-100 text-xs">Administração Geral</p>
            </div>
          </div>
          <button onClick={() => auth.signOut()} className="flex items-center gap-2 hover:bg-blue-700 p-2 rounded-lg transition-colors">
            <LogOut size={20} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 flex flex-col gap-6">
        {/* Tabs */}
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
          <button 
            onClick={() => setActiveTab('stores')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${activeTab === 'stores' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Store size={20} />
            Lojas
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <Users size={20} />
            Colaboradores
          </button>
        </div>

        {activeTab === 'stores' ? (
          <>
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Plus size={20} className="text-blue-500" />
                Cadastrar Nova Loja
              </h2>
              <form onSubmit={handleAddStore} className="flex flex-col sm:flex-row gap-4">
                <input 
                  type="text" 
                  value={newStoreName} 
                  onChange={(e) => setNewStoreName(e.target.value)} 
                  placeholder="Ex: Loja Centro, Loja Shopping..." 
                  className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors whitespace-nowrap">
                  Criar Loja
                </button>
              </form>
            </section>

            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100">
                <h2 className="font-semibold text-gray-700">Lojas Ativas ({stores.length})</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {stores.map(store => (
                  <div 
                    key={store.id} 
                    className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div 
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() => onSelectStore(store.id, store.name)}
                    >
                      <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <Store size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{store.name}</p>
                        <p className="text-xs text-gray-400">ID: {store.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => onSelectStore(store.id, store.name)}
                        className="flex items-center gap-1 text-blue-600 font-medium text-sm hover:underline"
                      >
                        Ver Estoque
                        <ChevronRight size={18} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setStoreToDelete({id: store.id, name: store.name}); }}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir Loja"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {stores.length === 0 && (
                  <div className="p-12 text-center text-gray-400">
                    <Store size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Nenhuma loja cadastrada ainda.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100">
              <h2 className="font-semibold text-gray-700">Gerenciar Acessos ({users.length})</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {users.map(user => (
                <div key={user.id} className="p-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${user.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                        <Users size={20} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{user.email}</p>
                        <p className="text-xs text-gray-400 capitalize">Cargo: {user.role === 'admin' ? 'Administrador' : 'Colaborador'}</p>
                      </div>
                    </div>
                    {user.email !== 'mariabonitaacai8@gmail.com' && (
                      <select 
                        value={user.role} 
                        onChange={(e) => changeUserRole(user.id, e.target.value as any)}
                        className="text-xs p-1 border rounded bg-white"
                      >
                        <option value="store">Colaborador</option>
                        <option value="admin">Administrador</option>
                      </select>
                    )}
                  </div>

                  {user.role === 'store' && (
                    <div className="flex flex-col gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                        <UserCheck size={14} />
                        Vincular a uma loja:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {stores.map(store => (
                          <button
                            key={store.id}
                            onClick={() => assignUserToStore(user.id, store.id)}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${user.storeId === store.id ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300'}`}
                          >
                            {store.name}
                          </button>
                        ))}
                        {stores.length === 0 && <p className="text-xs text-red-400 italic">Crie uma loja primeiro.</p>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        {storeToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertTriangle size={28} />
                <h3 className="text-xl font-bold">Excluir Loja?</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja excluir a loja <strong>&quot;{storeToDelete.name}&quot;</strong>? 
                Esta ação apagará <strong>todo o estoque</strong> desta loja e removerá o acesso dos colaboradores vinculados a ela. Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setStoreToDelete(null)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteStore}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl z-50 text-sm font-medium"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
