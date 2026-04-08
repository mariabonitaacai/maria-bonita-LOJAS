import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Package, Plus, Trash2, Share2, PlusCircle, MinusCircle, DollarSign, Box, AlertTriangle, CheckCircle, Edit2, Check, X, Search, RefreshCw, LogOut, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';

export default function Inventory({ storeId, storeName, onBack }: { storeId: string, storeName: string, onBack?: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [formData, setFormData] = useState({ name: '', quantity: 0, price: '' });
  const [notification, setNotification] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', price: '' });

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    if (!storeId) return;
    const itemsRef = collection(db, `stores/${storeId}/items`);
    const unsubscribe = onSnapshot(itemsRef, (snapshot) => {
      const loadedItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(loadedItems);
    }, (error) => {
      console.error("Error fetching items:", error);
      showNotification("Erro ao carregar itens.");
    });
    return () => unsubscribe();
  }, [storeId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showNotification('Por favor, insira o nome do artigo.');
      return;
    }
    try {
      await addDoc(collection(db, `stores/${storeId}/items`), {
        name: formData.name,
        quantity: Number(formData.quantity) || 0,
        waste: 0,
        price: Number(formData.price.replace(',', '.')) || 0
      });
      setFormData({ name: '', quantity: 0, price: '' });
      setSearchTerm('');
      showNotification('Artigo adicionado com sucesso!');
    } catch (error) {
      console.error("Error adding item:", error);
      showNotification('Erro ao adicionar artigo.');
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, `stores/${storeId}/items`, id));
      showNotification('Artigo removido.');
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  const adjustValue = async (id: string, field: string, change: number, currentValue: number) => {
    const newValue = Math.max(0, currentValue + change);
    try {
      await updateDoc(doc(db, `stores/${storeId}/items`, id), {
        [field]: Number(newValue.toFixed(2))
      });
    } catch (error) {
      console.error("Error updating value:", error);
    }
  };

  const handleDirectInput = async (id: string, field: string, value: string) => {
    if (value === '') return;
    try {
      await updateDoc(doc(db, `stores/${storeId}/items`, id), {
        [field]: Number(value)
      });
    } catch (error) {
      console.error("Error updating value:", error);
    }
  };

  const startEditing = (item: any) => {
    setEditingId(item.id);
    setEditFormData({ name: item.name, price: item.price });
  };

  const saveEditing = async (id: string) => {
    if (!editFormData.name.trim()) {
      showNotification('O nome não pode ficar vazio.');
      return;
    }
    try {
      await updateDoc(doc(db, `stores/${storeId}/items`, id), {
        name: editFormData.name,
        price: Number(String(editFormData.price).replace(',', '.')) || 0
      });
      setEditingId(null);
      showNotification('Artigo atualizado com sucesso!');
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const confirmReset = async () => {
    try {
      const promises = items.map(item => 
        updateDoc(doc(db, `stores/${storeId}/items`, item.id), { quantity: 0, waste: 0 })
      );
      await Promise.all(promises);
      setIsResetModalOpen(false);
      showNotification('Inventário zerado com sucesso!');
    } catch (error) {
      console.error("Error resetting inventory:", error);
      showNotification('Erro ao zerar inventário.');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const shareViaWhatsApp = () => {
    const hasActiveItems = items.some((item: any) => (Number(item.quantity) || 0) > 0 || (Number(item.waste) || 0) > 0);
    if (!hasActiveItems) {
      showNotification('O inventário está vazio (tudo a 0). Preencha as quantidades antes de partilhar.');
      return;
    }

    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    let message = `📦 *RELATÓRIO DE INVENTÁRIO - ${storeName.toUpperCase()}* 📦\n`;
    message += `📅 Data: ${dataAtual} às ${horaAtual}\n\n`;

    items.forEach((item: any) => {
      const qtd = Number(item.quantity) || 0;
      const desperdicio = Number(item.waste) || 0;
      if (qtd > 0 || desperdicio > 0) {
        message += `🔹 *${item.name}*\n`;
        message += `   Estoque Útil: ${qtd}\n`;
        if (desperdicio > 0) {
          message += `   ⚠️ Descarte/Perda: ${desperdicio}\n`;
          message += `   📉 Prejuízo: ${formatCurrency(desperdicio * item.price)}\n`;
        }
        message += `   Valor Unit.: ${formatCurrency(item.price)}\n`;
        message += `   Subtotal (Útil): ${formatCurrency(qtd * item.price)}\n\n`;
      }
    });

    message += `📊 *RESUMO*\n`;
    message += `Total de Artigos Úteis: ${totalItems.toFixed(2)}\n`;
    message += `Valor Total em Estoque: ${formatCurrency(totalValue)}\n`;
    if (totalWasteValue > 0) {
      message += `⚠️ Total de Prejuízo (Desperdício): ${formatCurrency(totalWasteValue)}\n`;
    }

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const filteredItems = useMemo(() => {
    return items.filter((item: any) => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const totalItems = items.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0);
  const totalValue = items.reduce((acc: number, item: any) => acc + ((Number(item.quantity) || 0) * Number(item.price)), 0);
  const totalWasteValue = items.reduce((acc: number, item: any) => acc + ((Number(item.waste) || 0) * Number(item.price)), 0);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-20 md:pb-10">
      <header className="bg-blue-600 text-white p-6 shadow-md rounded-b-2xl mb-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="mr-2 hover:bg-blue-700 p-2 rounded-full transition-colors">
                <ArrowLeft size={24} />
              </button>
            )}
            <Package size={32} />
            <h1 className="text-2xl font-bold">Estoque Zap - {storeName}</h1>
          </div>
          <button onClick={() => auth.signOut()} className="flex items-center gap-2 hover:bg-blue-700 p-2 rounded-lg transition-colors">
            <LogOut size={20} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 flex flex-col gap-6">
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PlusCircle size={20} className="text-blue-500" />
            Novo Artigo
          </h2>
          <form onSubmit={addItem} className="flex flex-col md:flex-row gap-4 md:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-600 mb-1">Nome do Produto</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} placeholder="Ex: Embalagem 500ml" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" />
            </div>
            <div className="flex gap-4">
              <div className="w-full md:w-28">
                <label className="block text-sm font-medium text-gray-600 mb-1">Qtd inicial</label>
                <input type="number" step="0.01" name="quantity" value={formData.quantity} onChange={handleInputChange} min="0" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" />
              </div>
              <div className="w-full md:w-32">
                <label className="block text-sm font-medium text-gray-600 mb-1">Preço (R$)</label>
                <input type="number" name="price" value={formData.price} onChange={handleInputChange} step="0.01" min="0" placeholder="0.00" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" />
              </div>
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex justify-center items-center gap-2 w-full md:w-auto">
              <Plus size={18} />
              <span className="hidden md:inline">Adicionar</span>
            </button>
          </form>
        </section>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 sm:gap-3">
            <div className="bg-blue-100 p-3 sm:p-2 rounded-xl text-blue-600"><Box size={24} className="sm:w-5 sm:h-5" /></div>
            <div><p className="text-sm sm:text-xs text-gray-500">Peças Úteis</p><p className="text-xl sm:text-lg font-bold">{totalItems.toFixed(2).replace('.00', '')}</p></div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 sm:gap-3">
            <div className="bg-green-100 p-3 sm:p-2 rounded-xl text-green-600"><DollarSign size={24} className="sm:w-5 sm:h-5" /></div>
            <div><p className="text-sm sm:text-xs text-gray-500">Valor em Estoque</p><p className="text-xl sm:text-lg font-bold">{formatCurrency(totalValue)}</p></div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 sm:gap-3">
            <div className="bg-red-100 p-3 sm:p-2 rounded-xl text-red-600"><AlertTriangle size={24} className="sm:w-5 sm:h-5" /></div>
            <div><p className="text-sm sm:text-xs text-gray-500">Prejuízo (Descarte)</p><p className="text-xl sm:text-lg font-bold text-red-600">{formatCurrency(totalWasteValue)}</p></div>
          </div>
        </div>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="font-semibold text-gray-700 whitespace-nowrap">Artigos no Inventário ({filteredItems.length})</h2>
            <div className="flex w-full sm:w-auto items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="Buscar artigo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm" />
              </div>
              <button onClick={() => setIsResetModalOpen(true)} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium whitespace-nowrap">
                <RefreshCw size={16} />
                <span className="hidden sm:inline">Zerar</span>
              </button>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto overflow-x-hidden">
            <AnimatePresence initial={false}>
              {filteredItems.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 text-center text-gray-400">
                    <Package size={48} className="mx-auto mb-3 opacity-20" />
                    <p>{searchTerm ? 'Nenhum artigo encontrado na busca.' : 'O seu inventário está vazio.'}</p>
                  </motion.div>
                ) : (
                  filteredItems.map((item: any) => (
                    <motion.div key={item.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                      {editingId === item.id ? (
                        <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full">
                          <div className="flex-1">
                            <label className="text-xs text-gray-500">Nome do Artigo</label>
                            <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="w-full p-2 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </div>
                          <div className="w-full sm:w-24">
                            <label className="text-xs text-gray-500">Preço</label>
                            <input type="number" step="0.01" value={editFormData.price} onChange={(e) => setEditFormData({...editFormData, price: e.target.value})} className="w-full p-2 border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          </div>
                          <div className="flex items-end gap-1">
                            <button onClick={() => saveEditing(item.id)} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"><Check size={20} /></button>
                            <button onClick={() => setEditingId(null)} className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"><X size={20} /></button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-800 text-base">{item.name}</h3>
                            <p className="text-xs text-gray-500">{formatCurrency(item.price)} / un</p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm text-gray-600 font-medium w-20">Estoque:</span>
                              <div className="flex items-center bg-gray-100 rounded-lg p-1 border border-gray-200">
                                <button onClick={() => adjustValue(item.id, 'quantity', -1, item.quantity)} className="p-1 text-gray-600 hover:text-red-500 hover:bg-white rounded-md transition-all"><MinusCircle size={18} /></button>
                                <input type="number" step="0.01" value={item.quantity ?? ''} onChange={(e) => handleDirectInput(item.id, 'quantity', e.target.value)} className="w-14 text-center font-semibold bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-400 rounded" />
                                <button onClick={() => adjustValue(item.id, 'quantity', 1, item.quantity)} className="p-1 text-gray-600 hover:text-green-500 hover:bg-white rounded-md transition-all"><PlusCircle size={18} /></button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm text-red-500 font-medium w-20">Descarte:</span>
                              <div className="flex items-center bg-red-50 rounded-lg p-1 border border-red-100">
                                <button onClick={() => adjustValue(item.id, 'waste', -1, item.waste)} className="p-1 text-red-400 hover:text-red-600 hover:bg-white rounded-md transition-all"><MinusCircle size={18} /></button>
                                <input type="number" step="0.01" value={item.waste ?? ''} onChange={(e) => handleDirectInput(item.id, 'waste', e.target.value)} className="w-14 text-center font-semibold text-red-600 bg-transparent focus:outline-none focus:ring-1 focus:ring-red-400 rounded" />
                                <button onClick={() => adjustValue(item.id, 'waste', 1, item.waste)} className="p-1 text-red-400 hover:text-red-600 hover:bg-white rounded-md transition-all"><PlusCircle size={18} /></button>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-end sm:ml-2">
                            <button onClick={() => startEditing(item)} className="text-gray-400 hover:text-blue-500 p-2 transition-colors"><Edit2 size={18} /></button>
                            <button onClick={() => deleteItem(item.id)} className="text-gray-400 hover:text-red-500 p-2 transition-colors"><Trash2 size={20} /></button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))
                )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-40">
        <button onClick={shareViaWhatsApp} className="bg-[#25D366] hover:bg-[#128C7E] text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-3 group">
          <Share2 size={24} />
          <span className="hidden md:block font-medium pr-2 max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap">Partilhar</span>
        </button>
      </div>

      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <div className="flex items-center gap-3 text-red-600 mb-4"><AlertTriangle size={24} /><h3 className="text-lg font-bold">Zerar Inventário?</h3></div>
              <p className="text-gray-600 mb-6">Tem certeza que deseja zerar todas as quantidades e descartes?</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">Cancelar</button>
                <button onClick={confirmReset} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">Sim, Zerar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} className="fixed top-6 left-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl border border-gray-700 z-50 flex items-center gap-2">
            {notification.includes('sucesso') && <CheckCircle size={18} className="text-green-400" />}
            {notification}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
