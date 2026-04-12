import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Package, Plus, Trash2, Share2, PlusCircle, MinusCircle, DollarSign, Box, AlertTriangle, CheckCircle, Edit, Check, X, Search, RefreshCw, LogOut, ArrowLeft, ShoppingCart, Send, Bell, Settings, ClipboardCheck, Filter, Download, TrendingUp, Tag, Minus, MoreVertical, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Inventory({ storeId, storeName, onBack }: { storeId: string, storeName: string, onBack?: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [formData, setFormData] = useState({ name: '', quantity: 0, price: '', dailyConsumption: '' });
  const [notification, setNotification] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', price: '', dailyConsumption: '' });
  
  // Order Generator State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderDays, setOrderDays] = useState(7);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'analysis'>('inventory');
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, { quantity?: number, waste?: number }>>({});

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
        price: Number(formData.price.replace(',', '.')) || 0,
        dailyConsumption: Number(formData.dailyConsumption) || 0
      });
      setFormData({ name: '', quantity: 0, price: '', dailyConsumption: '' });
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

  const calculateTrackingUpdates = (item: any, field: string, newValue: number) => {
    const updates: any = { [field]: Number(newValue.toFixed(2)) };
    
    if (field === 'quantity') {
      const today = new Date().toISOString().split('T')[0];
      
      if (item.lastCountDate !== today) {
        if (item.lastCountDate) {
          const diff = (item.lastCountQuantity || 0) - newValue;
          if (diff > 0) {
            const currentAvg = item.autoDailyConsumption || 0;
            const days = item.daysTracked || 0;
            const newAvg = ((currentAvg * days) + diff) / (days + 1);
            updates.autoDailyConsumption = Number(newAvg.toFixed(2));
            updates.daysTracked = days + 1;
          }
        }
        updates.lastCountDate = today;
        updates.lastCountQuantity = newValue;
      } else {
        updates.lastCountQuantity = newValue;
      }
    }
    return updates;
  };

  const adjustValue = (item: any, field: string, change: number) => {
    const currentValue = pendingUpdates[item.id]?.[field as 'quantity' | 'waste'] ?? item[field] ?? 0;
    const newValue = Math.max(0, currentValue + change);
    setPendingUpdates(prev => ({
      ...prev,
      [item.id]: {
        ...prev[item.id],
        [field]: Number(newValue.toFixed(2))
      }
    }));
  };

  const handleDirectInput = (item: any, field: string, value: string) => {
    const numValue = value === '' ? undefined : Number(value);
    setPendingUpdates(prev => ({
      ...prev,
      [item.id]: {
        ...prev[item.id],
        [field]: numValue
      }
    }));
  };

  const confirmUpdate = async (item: any, field: string) => {
    const newValue = pendingUpdates[item.id]?.[field as 'quantity' | 'waste'];
    if (newValue === undefined) return;

    try {
      const updates = calculateTrackingUpdates(item, field, newValue);
      await updateDoc(doc(db, `stores/${storeId}/items`, item.id), updates);
      
      setPendingUpdates(prev => {
        const newItemUpdates = { ...prev[item.id] };
        delete newItemUpdates[field as 'quantity' | 'waste'];
        if (Object.keys(newItemUpdates).length === 0) {
          const newPending = { ...prev };
          delete newPending[item.id];
          return newPending;
        }
        return { ...prev, [item.id]: newItemUpdates };
      });
      showNotification('Valor atualizado!');
    } catch (error) {
      console.error("Error updating value:", error);
      showNotification('Erro ao atualizar valor.');
    }
  };

  const cancelUpdate = (itemId: string, field: string) => {
    setPendingUpdates(prev => {
      const newItemUpdates = { ...prev[itemId] };
      delete newItemUpdates[field as 'quantity' | 'waste'];
      if (Object.keys(newItemUpdates).length === 0) {
        const newPending = { ...prev };
        delete newPending[itemId];
        return newPending;
      }
      return { ...prev, [itemId]: newItemUpdates };
    });
  };

  const startEditing = (item: any) => {
    setEditingId(item.id);
    setEditFormData({ name: item.name, price: item.price, dailyConsumption: item.dailyConsumption || '' });
  };

  const saveEditing = async (id: string) => {
    if (!editFormData.name.trim()) {
      showNotification('O nome não pode ficar vazio.');
      return;
    }
    try {
      await updateDoc(doc(db, `stores/${storeId}/items`, id), {
        name: editFormData.name,
        price: Number(String(editFormData.price).replace(',', '.')) || 0,
        dailyConsumption: Number(editFormData.dailyConsumption) || 0
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

  // --- Order Generator Logic ---
  const openOrderModal = () => {
    calculateOrder(7);
    setIsOrderModalOpen(true);
  };

  const calculateOrder = (days: number) => {
    setOrderDays(days);
    const newOrderItems = items.map(item => {
      const manualConsumption = Number(item.dailyConsumption) || 0;
      const autoConsumption = Number(item.autoDailyConsumption) || 0;
      const consumption = manualConsumption > 0 ? manualConsumption : autoConsumption;
      
      const needed = consumption * days;
      const suggested = Math.max(0, Math.ceil(needed - (Number(item.quantity) || 0)));
      return {
        id: item.id,
        name: item.name,
        suggested: suggested,
        adjusted: suggested,
        dailyConsumption: consumption,
        isAuto: manualConsumption === 0 && autoConsumption > 0
      };
    }).filter(item => item.suggested > 0 || item.dailyConsumption > 0);
    setOrderItems(newOrderItems);
  };

  const handleAdjustOrder = (id: string, change: number) => {
    setOrderItems(prev => prev.map(o => {
      if (o.id === id) {
        return { ...o, adjusted: Math.max(0, o.adjusted + change) };
      }
      return o;
    }));
  };

  const sendOrderViaWhatsApp = () => {
    const itemsToOrder = orderItems.filter(o => o.adjusted > 0);
    if (itemsToOrder.length === 0) {
      showNotification("Nenhum item para pedir.");
      return;
    }
    
    let message = `🛒 *PEDIDO DE COMPRA - ${storeName.toUpperCase()}* 🛒\n`;
    message += `📅 Previsão para: ${orderDays} dias\n\n`;
    
    itemsToOrder.forEach(item => {
      message += `✅ ${item.adjusted}x - ${item.name}\n`;
    });
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };
  // -----------------------------

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
    <div className="min-h-screen bg-background text-on-surface font-body pb-20 md:pb-10">
      <header className="sticky top-0 z-50 flex justify-between items-center px-4 md:px-8 h-20 w-full max-w-screen-2xl mx-auto bg-background border-b border-opacity-15 border-slate-400">
        <div className="flex items-center gap-8">
          <div className="flex items-center">
            {onBack && (
              <button onClick={onBack} className="mr-4 text-on-surface-variant hover:text-primary transition-colors">
                <ArrowLeft size={24} />
              </button>
            )}
            <img alt="Maria Bonita Açaíteria Logo" className="h-12 w-auto object-contain" src="https://lh3.googleusercontent.com/aida/ADBb0ugahC1qQy_pxsF4PbcE4DJXxxMGVV8PKznIL5Ruw0I-qbwo-A8IGWq7jYcAFB0tRIKaG5d8A0lcGHXaGpRa1MsxjE_TwIIh4VSViRBmxtn_4JHiVp2lyhJRmbE79N6KcqU7XRvsHIeSHmwQWGnDLGO-7J052QwUBudgkZ0UzwR5GHCSZUYtz0tTTr0FQWB-_nrdqCTqVqA-OYS54GfwFRLiAHJrgUTeoZ0WqpZ9kSED-OgVbu3HAfrH6D6J1uRaq1nYoNlVD95XMEk"/>
          </div>
          <nav className="hidden md:flex gap-6 items-center">
            <button onClick={() => setActiveTab('inventory')} className={`font-headline font-bold text-sm tracking-tight pb-1 transition-transform active:scale-95 ${activeTab === 'inventory' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}>Inventário</button>
            <button onClick={() => setActiveTab('analysis')} className={`font-headline font-bold text-sm tracking-tight pb-1 transition-transform active:scale-95 ${activeTab === 'analysis' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-primary'}`}>Análise Inteligente</button>
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative hidden sm:block">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-surface-container-high border-none rounded-full pl-10 pr-4 py-1.5 text-sm focus:ring-2 focus:ring-primary w-64 outline-none" placeholder="Buscar no estoque..." type="text"/>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-on-surface-variant hover:text-primary transition-colors"><Bell size={20} /></button>
            <button onClick={() => auth.signOut()} title="Sair" className="text-on-surface-variant hover:text-primary transition-colors"><LogOut size={20} /></button>
            <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-highest flex items-center justify-center text-primary font-bold">
              {auth.currentUser?.email?.[0].toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 md:px-8 py-10 space-y-10">
        <section className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <span className="text-primary font-bold tracking-widest text-xs uppercase">Estoque Zap</span>
            <h2 className="text-4xl font-extrabold font-headline tracking-tight mt-1">{storeName}</h2>
          </div>
          <div className="flex gap-3">
            <button onClick={openOrderModal} className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-lowest text-primary font-semibold rounded-lg shadow-sm border border-outline-variant hover:bg-surface-container transition-all active:scale-95">
              <ClipboardCheck size={20} />
              Gerar Pedido
            </button>
            <button onClick={() => setActiveTab(activeTab === 'inventory' ? 'analysis' : 'inventory')} className="md:hidden flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary font-semibold rounded-lg shadow-md hover:opacity-90 transition-all active:scale-95">
              <AlertTriangle size={20} />
              {activeTab === 'inventory' ? 'Análise' : 'Inventário'}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-surface-container-lowest p-8 rounded-xl flex flex-col justify-between border-l-4 border-primary group hover:bg-primary-container transition-colors duration-300 shadow-sm">
            <div className="flex justify-between items-start">
              <Package size={32} className="text-primary" />
              <span className="text-on-surface-variant text-xs font-bold font-label tracking-widest uppercase">Volume Total</span>
            </div>
            <div className="mt-8">
              <div className="text-5xl font-headline font-extrabold text-on-surface tracking-tighter">{totalItems.toFixed(2).replace('.00', '')}</div>
              <div className="text-sm text-on-surface-variant mt-1 font-medium">Insumos Ativos</div>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-8 rounded-xl flex flex-col justify-between border-l-4 border-on-secondary-container group hover:bg-secondary-container transition-colors duration-300 shadow-sm">
            <div className="flex justify-between items-start">
              <DollarSign size={32} className="text-on-secondary-container" />
              <span className="text-on-surface-variant text-xs font-bold font-label tracking-widest uppercase">Ativo Corrente</span>
            </div>
            <div className="mt-8">
              <div className="text-5xl font-headline font-extrabold text-on-surface tracking-tighter">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</div>
              <div className="text-sm text-on-surface-variant mt-1 font-medium">Valor em Estoque</div>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-8 rounded-xl flex flex-col justify-between border-l-4 border-error group hover:bg-error-container transition-colors duration-300 shadow-sm">
            <div className="flex justify-between items-start">
              <Trash2 size={32} className="text-error" />
              <span className="text-on-surface-variant text-xs font-bold font-label tracking-widest uppercase">Perda Operacional</span>
            </div>
            <div className="mt-8">
              <div className="text-5xl font-headline font-extrabold text-on-surface tracking-tighter">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalWasteValue)}</div>
              <div className="text-sm text-on-surface-variant mt-1 font-medium">Prejuízo (Descarte)</div>
            </div>
          </div>
        </section>

        {activeTab === 'inventory' ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
            <aside className="xl:col-span-4 space-y-6">
              <div className="bg-surface-container-low p-8 rounded-xl shadow-sm">
                <h3 className="text-xl font-headline font-bold mb-6 flex items-center gap-2">
                  <Edit size={24} className="text-primary" />
                  Cadastrar Artigo
                </h3>
                <form onSubmit={addItem} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold font-label text-on-surface-variant uppercase tracking-wider ml-1">Nome do Produto</label>
                    <input name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-surface-container-highest border-b-2 border-outline-variant focus:border-primary border-t-0 border-x-0 rounded-t-lg px-4 py-3 text-sm focus:ring-0 transition-colors outline-none" placeholder="Ex: Polpa de Açaí 10L" type="text"/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold font-label text-on-surface-variant uppercase tracking-wider ml-1">Qtd Inicial</label>
                      <input name="quantity" value={formData.quantity} onChange={handleInputChange} step="0.01" min="0" className="w-full bg-surface-container-highest border-b-2 border-outline-variant focus:border-primary border-t-0 border-x-0 rounded-t-lg px-4 py-3 text-sm focus:ring-0 outline-none" placeholder="0" type="number"/>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold font-label text-on-surface-variant uppercase tracking-wider ml-1">Preço Unit.</label>
                      <input name="price" value={formData.price} onChange={handleInputChange} step="0.01" min="0" className="w-full bg-surface-container-highest border-b-2 border-outline-variant focus:border-primary border-t-0 border-x-0 rounded-t-lg px-4 py-3 text-sm focus:ring-0 outline-none" placeholder="0.00" type="number"/>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold font-label text-on-surface-variant uppercase tracking-wider ml-1">Consumo Diário Estimado</label>
                    <input name="dailyConsumption" value={formData.dailyConsumption} onChange={handleInputChange} step="0.01" min="0" className="w-full bg-surface-container-highest border-b-2 border-outline-variant focus:border-primary border-t-0 border-x-0 rounded-t-lg px-4 py-3 text-sm focus:ring-0 outline-none" placeholder="Média de saídas por dia" type="number"/>
                  </div>
                  <button type="submit" className="w-full bg-primary text-on-primary font-bold py-4 rounded-lg mt-4 shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex justify-center items-center gap-2">
                    <Plus size={20} />
                    Adicionar ao Inventário
                  </button>
                </form>
              </div>
              <div className="relative h-64 rounded-xl overflow-hidden group hidden md:block">
                <img alt="Organization" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwX3OCZ8HWNi19lARoD2ylGhHqkTMdtfdQdaHacq5FG56YDxCdMuzIAqDdo-4pQ3wV85Fptj8wYX6l04-2a_KJxB7kjg58HWJ9nFKE2oFX11hpRrOPR9NGpcr2jisBeaaTvqXFsGQ2Vc67AI93WbIt6iPYxS7ibd6OqeouWjg8jhBbWxuNyCBS735AEXs716DYHVJLEdZj0ISg40pv7d6QyewEO7KPrmWhyKdZPz3iv2MJUGTTKUCBlM--r8jvh7wrWFSpTI0ZyiY5"/>
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent flex flex-col justify-end p-6">
                  <p className="text-white font-headline font-bold text-lg">Otimização Maria Bonita</p>
                  <p className="text-white/70 text-xs">Controle de validade e desperdício de insumos em tempo real.</p>
                </div>
              </div>
            </aside>

            <section className="xl:col-span-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                <h3 className="text-2xl font-headline font-extrabold tracking-tight">Itens em Estoque</h3>
                <div className="flex gap-2">
                  <button onClick={shareViaWhatsApp} title="Exportar/Compartilhar" className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"><Download size={20} /></button>
                  <button onClick={() => setIsResetModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-error-container/20 text-error font-bold rounded-lg hover:bg-error-container/30 transition-colors text-sm">
                    <RefreshCw size={18} />
                    Zerar Tudo
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <AnimatePresence>
                  {filteredItems.length === 0 ? (
                    <div className="text-center py-12 text-on-surface-variant">
                      <Package size={48} className="mx-auto mb-4 opacity-20" />
                      <p>Nenhum artigo encontrado.</p>
                    </div>
                  ) : (
                    filteredItems.map((item: any) => {
                      const consumption = Number(item.dailyConsumption) > 0 ? Number(item.dailyConsumption) : Number(item.autoDailyConsumption || 0);
                      const isLowStock = consumption > 0 && (Number(item.quantity) || 0) < (consumption * 2);
                      const isHighConsumption = consumption > 5;
                      
                      return (
                        <motion.div key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface-container-lowest p-6 rounded-xl flex flex-col lg:flex-row items-center gap-6 lg:gap-8 border border-transparent transition-shadow hover:shadow-xl hover:shadow-purple-100/50 hover:border-primary/10">
                          {editingId === item.id ? (
                            <div className="flex-1 w-full flex flex-col sm:flex-row gap-3">
                              <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="flex-1 p-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                              <input type="number" step="0.01" value={editFormData.price} onChange={(e) => setEditFormData({...editFormData, price: e.target.value})} className="w-24 p-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="Preço" />
                              <input type="number" step="0.01" value={editFormData.dailyConsumption} onChange={(e) => setEditFormData({...editFormData, dailyConsumption: e.target.value})} className="w-24 p-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="Consumo" />
                              <div className="flex gap-2">
                                <button onClick={() => saveEditing(item.id)} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"><CheckCircle size={20} /></button>
                                <button onClick={() => setEditingId(null)} className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"><X size={20} /></button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 w-full min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                  <h4 className="text-lg font-bold truncate">{item.name}</h4>
                                  {isLowStock ? (
                                    <span className="bg-error-container text-on-error-container text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter whitespace-nowrap">Estoque Baixo</span>
                                  ) : isHighConsumption ? (
                                    <span className="bg-primary-container text-on-primary-container text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter whitespace-nowrap">Em Alta</span>
                                  ) : (
                                    <span className="bg-secondary-container text-on-secondary-container text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter whitespace-nowrap">Estável</span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-on-surface-variant font-medium">
                                  <span className="flex items-center gap-1"><TrendingUp size={14} /> Consumo: {consumption.toFixed(2)}/dia</span>
                                  <span className="flex items-center gap-1"><Tag size={14} /> Preço: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-6 lg:gap-12 shrink-0 w-full lg:w-auto justify-between lg:justify-end">
                                <div className="flex flex-col items-center gap-2">
                                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Estoque Atual</span>
                                  <div className={`flex items-center rounded-full px-2 py-1 transition-colors ${pendingUpdates[item.id]?.quantity !== undefined ? 'bg-primary/10 ring-2 ring-primary' : 'bg-surface-container-low'}`}>
                                    <button onClick={() => adjustValue(item, 'quantity', -1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-primary"><Minus size={16} /></button>
                                    <input type="number" step="0.01" value={pendingUpdates[item.id]?.quantity ?? item.quantity ?? ''} onChange={(e) => handleDirectInput(item, 'quantity', e.target.value)} className="w-14 text-center font-headline font-extrabold text-lg bg-transparent focus:outline-none" />
                                    <button onClick={() => adjustValue(item, 'quantity', 1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors text-primary"><Plus size={16} /></button>
                                  </div>
                                  {pendingUpdates[item.id]?.quantity !== undefined && (
                                    <div className="flex gap-2 mt-1">
                                      <button onClick={() => confirmUpdate(item, 'quantity')} className="p-1 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors shadow-sm"><Check size={12} /></button>
                                      <button onClick={() => cancelUpdate(item.id, 'quantity')} className="p-1 bg-gray-400 text-white rounded-full hover:bg-gray-500 transition-colors shadow-sm"><X size={12} /></button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                  <span className="text-[10px] font-bold text-error uppercase tracking-widest">Descarte</span>
                                  <div className={`flex items-center rounded-full px-2 py-1 transition-colors ${pendingUpdates[item.id]?.waste !== undefined ? 'bg-error/10 ring-2 ring-error' : 'bg-error-container/10'}`}>
                                    <button onClick={() => adjustValue(item, 'waste', -1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-error-container/20 transition-colors text-error"><Minus size={16} /></button>
                                    <input type="number" step="0.01" value={pendingUpdates[item.id]?.waste ?? item.waste ?? ''} onChange={(e) => handleDirectInput(item, 'waste', e.target.value)} className="w-14 text-center font-headline font-extrabold text-lg text-error bg-transparent focus:outline-none" />
                                    <button onClick={() => adjustValue(item, 'waste', 1)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-error-container/20 transition-colors text-error"><Plus size={16} /></button>
                                  </div>
                                  {pendingUpdates[item.id]?.waste !== undefined && (
                                    <div className="flex gap-2 mt-1">
                                      <button onClick={() => confirmUpdate(item, 'waste')} className="p-1 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors shadow-sm"><Check size={12} /></button>
                                      <button onClick={() => cancelUpdate(item.id, 'waste')} className="p-1 bg-gray-400 text-white rounded-full hover:bg-gray-500 transition-colors shadow-sm"><X size={12} /></button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col gap-2">
                                  <button onClick={() => startEditing(item)} className="text-on-surface-variant hover:text-primary transition-colors"><Edit size={18} /></button>
                                  <button onClick={() => deleteItem(item.id)} className="text-on-surface-variant hover:text-error transition-colors"><Trash2 size={18} /></button>
                                </div>
                              </div>
                            </>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </section>
          </div>
        ) : (
          <section className="flex flex-col gap-6">
            {/* Dashboard Visual */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico de Pizza: Distribuição Financeira */}
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-transparent flex flex-col">
                <h2 className="text-lg font-headline font-bold mb-4 flex items-center gap-2 text-on-surface">
                  <PieChartIcon size={20} className="text-primary" />
                  Distribuição Financeira
                </h2>
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Ativo Corrente', value: totalValue, color: '#6366f1' }, // primary
                          { name: 'Perda (Descarte)', value: totalWasteValue, color: '#ef4444' } // error
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[
                          { name: 'Ativo Corrente', value: totalValue, color: '#6366f1' },
                          { name: 'Perda (Descarte)', value: totalWasteValue, color: '#ef4444' }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico de Barras: Top Consumo */}
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-transparent flex flex-col">
                <h2 className="text-lg font-headline font-bold mb-4 flex items-center gap-2 text-on-surface">
                  <BarChart3 size={20} className="text-primary" />
                  Top 5: Maior Consumo Diário
                </h2>
                <div className="flex-1 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={items
                        .map(item => ({
                          name: item.name,
                          consumo: Number(item.dailyConsumption) > 0 ? Number(item.dailyConsumption) : Number(item.autoDailyConsumption || 0)
                        }))
                        .sort((a, b) => b.consumo - a.consumo)
                        .slice(0, 5)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                      <RechartsTooltip 
                        cursor={{ fill: '#f1f5f9' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="consumo" name="Consumo/Dia" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-transparent">
                <h2 className="text-xl font-headline font-bold mb-2 flex items-center gap-2 text-primary">
                  <Package size={24} />
                  Produtos de Baixa Saída (Parados)
                </h2>
                <p className="text-sm text-on-surface-variant mb-6">Itens com estoque alto, mas com consumo diário calculado muito baixo ou zero.</p>
                <div className="space-y-4">
                  {items.filter(i => (Number(i.quantity) || 0) > 5 && (Number(i.autoDailyConsumption) || 0) < 0.5).length === 0 ? (
                    <p className="text-sm text-on-surface-variant italic">Nenhum produto parado detectado.</p>
                  ) : items.filter(i => (Number(i.quantity) || 0) > 5 && (Number(i.autoDailyConsumption) || 0) < 0.5).map(item => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-surface-container-low rounded-lg border border-outline-variant/30">
                      <span className="font-bold text-on-surface">{item.name}</span>
                      <div className="text-right">
                        <p className="text-sm font-bold text-on-surface">Estoque: {item.quantity}</p>
                        <p className="text-xs text-on-surface-variant">Saída média: {Number(item.autoDailyConsumption || 0).toFixed(2)}/dia</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-transparent">
                <h2 className="text-xl font-headline font-bold mb-2 flex items-center gap-2 text-error">
                  <Trash2 size={24} />
                  Atenção: Alto Desperdício
                </h2>
                <p className="text-sm text-on-surface-variant mb-6">Itens com maior quantidade de descarte registrado.</p>
                <div className="space-y-4">
                  {items.filter(i => (Number(i.waste) || 0) > 0).sort((a, b) => (Number(b.waste) || 0) - (Number(a.waste) || 0)).slice(0, 5).length === 0 ? (
                    <p className="text-sm text-on-surface-variant italic">Nenhum desperdício registrado.</p>
                  ) : items.filter(i => (Number(i.waste) || 0) > 0).sort((a, b) => (Number(b.waste) || 0) - (Number(a.waste) || 0)).slice(0, 5).map(item => (
                    <div key={item.id} className="flex justify-between items-center p-4 bg-error-container/10 rounded-lg border border-error/20">
                      <span className="font-bold text-error">{item.name}</span>
                      <div className="text-right">
                        <p className="text-sm font-bold text-error">Descarte: {item.waste}</p>
                        <p className="text-xs text-error/80">Prejuízo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((Number(item.waste) || 0) * (Number(item.price) || 0))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
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
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface-container-lowest rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <div className="flex items-center gap-3 text-error mb-4"><AlertTriangle size={24} /><h3 className="text-lg font-bold">Zerar Inventário?</h3></div>
              <p className="text-on-surface-variant mb-6">Tem certeza que deseja zerar todas as quantidades e descartes?</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 text-on-surface-variant hover:bg-surface-container rounded-lg font-medium transition-colors">Cancelar</button>
                <button onClick={confirmReset} className="px-4 py-2 bg-error hover:bg-error/90 text-on-error rounded-lg font-medium transition-colors">Sim, Zerar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOrderModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface-container-lowest rounded-2xl p-6 max-w-2xl w-full shadow-xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-primary">
                  <ShoppingCart size={28} />
                  <h3 className="text-xl font-bold font-headline text-on-surface">Gerador de Pedidos</h3>
                </div>
                <button onClick={() => setIsOrderModalOpen(false)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex items-center gap-4 mb-6 bg-primary-container/30 p-4 rounded-xl border border-primary-container">
                <label className="font-medium text-primary">Previsão para quantos dias?</label>
                <div className="flex items-center bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
                  <button onClick={() => calculateOrder(Math.max(1, orderDays - 1))} className="px-3 py-2 text-primary hover:bg-surface-container transition-colors"><Minus size={18} /></button>
                  <input type="number" value={orderDays} onChange={(e) => calculateOrder(Number(e.target.value))} className="w-16 text-center font-bold text-primary focus:outline-none" />
                  <button onClick={() => calculateOrder(orderDays + 1)} className="px-3 py-2 text-primary hover:bg-surface-container transition-colors"><Plus size={18} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 mb-6">
                {orderItems.length === 0 ? (
                  <div className="text-center py-10 text-on-surface-variant">
                    <Package size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Nenhum item configurado com &quot;Consumo Diário&quot;.</p>
                    <p className="text-sm mt-2">Edite seus produtos e adicione o consumo médio diário para gerar pedidos automaticamente.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orderItems.map(item => (
                      <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${item.adjusted > 0 ? 'bg-surface-container-lowest border-outline-variant shadow-sm' : 'bg-surface-container border-transparent opacity-60'}`}>
                        <div className="flex-1">
                          <p className="font-medium text-on-surface">{item.name}</p>
                          <p className="text-xs text-on-surface-variant">Sugestão do sistema: {item.suggested}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleAdjustOrder(item.id, -1)} className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-lg transition-colors"><Minus size={20} /></button>
                          <span className={`w-8 text-center font-bold text-lg ${item.adjusted > 0 ? 'text-primary' : 'text-on-surface-variant'}`}>{item.adjusted}</span>
                          <button onClick={() => handleAdjustOrder(item.id, 1)} className="p-2 text-on-surface-variant hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"><Plus size={20} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-surface-container">
                <button onClick={() => setIsOrderModalOpen(false)} className="flex-1 py-3 px-4 bg-surface-container hover:bg-surface-container-high text-on-surface font-medium rounded-xl transition-colors">
                  Cancelar
                </button>
                <button onClick={sendOrderViaWhatsApp} disabled={orderItems.filter(o => o.adjusted > 0).length === 0} className="flex-1 py-3 px-4 bg-[#25D366] hover:bg-[#128C7E] disabled:bg-surface-container-high disabled:text-on-surface-variant disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Send size={18} />
                  Enviar Pedido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -20, x: '-50%' }} className="fixed top-6 left-1/2 bg-inverse-surface text-inverse-on-surface px-6 py-3 rounded-full shadow-xl border border-outline-variant z-50 flex items-center gap-2">
            {notification.includes('sucesso') && <CheckCircle size={18} className="text-green-400" />}
            {notification}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
