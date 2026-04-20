import React, { useState, useMemo } from 'react';
import { auth } from '../firebase';
import { Store, Plus, LogOut, ChevronRight, Users, UserCheck, ShieldCheck, Trash2, AlertTriangle, DollarSign, CheckCircle, XCircle, Clock, TrendingUp, TrendingDown, Wallet, PieChart as PieChartIcon, BarChart3, Edit, X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAdmin } from '../hooks/useAdmin';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ChatMaria from './ChatMaria';

export default function AdminDashboard({ onSelectStore }: { onSelectStore: (storeId: string, storeName: string) => void }) {
  const { 
    stores, 
    users, 
    expensesByStore, 
    closingsByStore, 
    sessionsByStore,
    createStore: createStoreHook,
    deleteStore: deleteStoreHook,
    updateUserRole: updateUserRoleHook,
    updateUserStore: updateUserStoreHook,
    updateExpense: updateExpenseHook,
    deleteExpense: deleteExpenseHookHook,
    updateClosing: updateClosingHook,
    deleteClosing: deleteClosingHookHook,
    updateSession: updateSessionHook,
    deleteSession: deleteSessionHookHook,
    isLoading
  } = useAdmin();
  const [newStoreName, setNewStoreName] = useState('');
  const [activeTab, setActiveTab] = useState<'stores' | 'users' | 'finance'>('stores');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [financeStoreFilter, setFinanceStoreFilter] = useState<string>('all');
  const [notification, setNotification] = useState<string | null>(null);
  const [storeToDelete, setStoreToDelete] = useState<{id: string, name: string} | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<{storeId: string, id: string} | null>(null);
  const [closingToDelete, setClosingToDelete] = useState<{storeId: string, id: string} | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<{storeId: string, id: string} | null>(null);
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [editingClosing, setEditingClosing] = useState<any | null>(null);

  const confirmDeleteClosing = async () => {
    if (!closingToDelete) return;
    try {
      await deleteClosingHookHook(closingToDelete.storeId, closingToDelete.id);
      showNotification('Fechamento excluído com sucesso.');
      setClosingToDelete(null);
    } catch (error) {
      console.error("Error deleting closing:", error);
      showNotification('Erro ao excluir fechamento.');
    }
  };

  const saveClosingEdit = async () => {
    if (!editingClosing) return;
    try {
      const { id, storeId, storeName, ...data } = editingClosing;
      await updateClosingHook(storeId, id, {
        ...data,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.uid || ''
      });
      setEditingClosing(null);
      showNotification('Fechamento atualizado com sucesso.');
    } catch (error) {
      console.error("Error updating closing:", error);
      showNotification('Erro ao atualizar fechamento.');
    }
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteExpenseHookHook(expenseToDelete.storeId, expenseToDelete.id);
      showNotification('Despesa excluída com sucesso.');
      setExpenseToDelete(null);
    } catch (error) {
      console.error("Error deleting expense:", error);
      showNotification('Erro ao excluir despesa.');
    }
  };

  const saveExpenseEdit = async () => {
    if (!editingExpense) return;
    try {
      const { id, storeId, storeName, ...data } = editingExpense;
      await updateExpenseHook(storeId, id, {
        ...data,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.uid || ''
      });
      setEditingExpense(null);
      showNotification('Despesa atualizada com sucesso.');
    } catch (error) {
      console.error("Error updating expense:", error);
      showNotification('Erro ao atualizar despesa.');
    }
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    
    try {
      await deleteSessionHookHook(sessionToDelete.storeId, sessionToDelete.id);
      showNotification('Registro de caixa excluído com sucesso.');
      setSessionToDelete(null);
    } catch (error) {
      console.error("Error deleting session:", error);
      showNotification('Erro ao excluir registro.');
    }
  };

  const saveSessionEdit = async () => {
    if (!editingSession) return;
    
    try {
      const { id, storeId, storeName, ...data } = editingSession;
      await updateSessionHook(storeId, id, {
        ...data,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.uid || ''
      });
      setEditingSession(null);
      showNotification('Registro de caixa atualizado com sucesso.');
    } catch (error) {
      console.error("Error updating session:", error);
      showNotification('Erro ao atualizar registro.');
    }
  };

  // Finance State managed by useAdmin

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const allExpenses = useMemo(() => {
    let expenses = Object.values(expensesByStore).flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    if (financeStoreFilter !== 'all') {
      expenses = expensesByStore[financeStoreFilter] || [];
      expenses = expenses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      expenses = expenses.filter(e => {
        const date = new Date(e.createdAt);
        if (dateFilter === 'today') return date.toDateString() === now.toDateString();
        if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return date >= weekAgo;
        }
        if (dateFilter === 'month') {
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }
    
    return expenses.map(e => {
      const store = stores.find(s => s.id === e.storeId);
      return { ...e, storeName: store ? store.name : 'Desconhecida' };
    });
  }, [expensesByStore, dateFilter, financeStoreFilter, stores]);

  const allSessions = useMemo(() => {
    let sessions = Object.values(sessionsByStore).flat();
    
    if (financeStoreFilter !== 'all') {
      sessions = sessionsByStore[financeStoreFilter] || [];
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      sessions = sessions.filter(s => {
        const date = new Date(s.openedAt);
        if (dateFilter === 'today') return date.toDateString() === now.toDateString();
        if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return date >= weekAgo;
        }
        if (dateFilter === 'month') {
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }
        return true;
      });
    }
    return sessions;
  }, [sessionsByStore, dateFilter, financeStoreFilter]);

  const stats = useMemo(() => {
    const revenue = allSessions.reduce((sum, s) => sum + (Number(s.totalReported) || 0), 0);
    const expenses = allExpenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    
    const byMethod = allSessions.reduce((acc, s) => {
      acc.pix += (Number(s.pix) || 0);
      acc.cash += (Number(s.cashSales) || 0);
      acc.credit += (Number(s.credit) || 0);
      acc.debit += (Number(s.debit) || 0);
      return acc;
    }, { pix: 0, cash: 0, credit: 0, debit: 0 });

    const byStore = stores.map(store => {
      const storeRevenue = allSessions.filter(s => s.storeId === store.id).reduce((sum, s) => sum + (Number(s.totalReported) || 0), 0);
      const storeExpenses = allExpenses.filter(e => e.storeId === store.id && e.status === 'paid').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      return {
        name: store.name,
        receita: storeRevenue,
        despesa: storeExpenses,
        lucro: storeRevenue - storeExpenses
      };
    });

    const expensesByCategory = allExpenses.filter(e => e.status === 'paid').reduce((acc, e) => {
      const cat = e.category || 'Outros';
      acc[cat] = (acc[cat] || 0) + (Number(e.amount) || 0);
      return acc;
    }, {} as Record<string, number>);

    return { revenue, expenses, profit: revenue - expenses, byMethod, byStore, expensesByCategory };
  }, [allExpenses, allSessions, stores]);

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) return;
    try {
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

      await createStoreHook(newStoreName, standardItems);

      setNewStoreName('');
      showNotification('Loja criada com sucesso (com estoque padrão)!');
    } catch (error) {
      console.error("Error adding store:", error);
    }
  };

  const handleDeleteStore = async () => {
    if (!storeToDelete) return;
    
    try {
      await deleteStoreHook(storeToDelete.id);
      showNotification(`Loja "${storeToDelete.name}" excluída com sucesso!`);
      setStoreToDelete(null);
    } catch (error) {
      console.error("Error deleting store:", error);
      showNotification('Erro ao excluir a loja.');
    }
  };

  const assignUserToStore = async (userId: string, storeId: string) => {
    try {
      await updateUserStoreHook(userId, storeId);
      showNotification('Usuário vinculado à loja!');
    } catch (error) {
      console.error("Error assigning user:", error);
    }
  };

  const changeUserRole = async (userId: string, newRole: 'admin' | 'store') => {
    try {
      await updateUserRoleHook(userId, newRole);
      showNotification('Cargo do usuário atualizado!');
    } catch (error) {
      console.error("Error changing role:", error);
    }
  };

  const updateExpenseStatus = async (storeId: string, expenseId: string, newStatus: 'paid' | 'cancelled') => {
    try {
      await updateExpenseHook(storeId, expenseId, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.uid || ''
      });
      showNotification(`Despesa marcada como ${newStatus === 'paid' ? 'Paga' : 'Cancelada'}!`);
    } catch (error) {
      console.error("Error updating expense status:", error);
      showNotification('Erro ao atualizar despesa.');
    }
  };

  const pendingExpenses = useMemo(() => {
    let expenses = allExpenses.filter(e => e.status === 'pending');
    return expenses.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [allExpenses]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body pb-10">
      <header className="bg-primary text-on-primary p-8 shadow-lg rounded-b-[2rem] mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="max-w-4xl mx-auto flex items-center justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-headline font-bold tracking-tight">Painel Master</h1>
              <p className="text-primary-container/80 text-xs font-medium tracking-wider uppercase">Administração Geral • Maria Bonita</p>
            </div>
          </div>
          <button onClick={() => auth.signOut()} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all active:scale-95 backdrop-blur-md border border-white/10">
            <LogOut size={20} />
            <span className="hidden sm:inline font-semibold">Sair</span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 flex flex-col gap-8">
        {/* Tabs */}
        <div className="flex bg-surface-container-low p-1.5 rounded-2xl shadow-sm border border-outline-variant flex-wrap sm:flex-nowrap">
          <button 
            onClick={() => setActiveTab('stores')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-2 rounded-xl font-bold transition-all ${activeTab === 'stores' ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <Store size={20} />
            Lojas
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-2 rounded-xl font-bold transition-all ${activeTab === 'users' ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <Users size={20} />
            Colaboradores
          </button>
          <button 
            onClick={() => setActiveTab('finance')}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-2 rounded-xl font-bold transition-all ${activeTab === 'finance' ? 'bg-primary text-on-primary shadow-lg' : 'text-on-surface-variant hover:bg-surface-container'}`}
          >
            <DollarSign size={20} />
            Financeiro
          </button>
        </div>

        {activeTab === 'stores' ? (
          <>
            <section className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm border border-outline-variant">
              <h2 className="text-xl font-headline font-bold mb-6 flex items-center gap-2">
                <Plus size={24} className="text-primary" />
                Cadastrar Nova Loja
              </h2>
              <form onSubmit={handleAddStore} className="flex flex-col sm:flex-row gap-4">
                <input 
                  type="text" 
                  value={newStoreName} 
                  onChange={(e) => setNewStoreName(e.target.value)} 
                  placeholder="Ex: Loja Centro, Loja Shopping..." 
                  className="flex-1 p-4 bg-surface-container-low border border-outline-variant rounded-2xl focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                />
                <button type="submit" className="bg-primary hover:bg-primary/90 text-on-primary font-bold py-4 px-8 rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 whitespace-nowrap">
                  Criar Loja
                </button>
              </form>
            </section>

            <section className="bg-surface-container-lowest rounded-3xl shadow-sm border border-outline-variant overflow-hidden">
              <div className="p-6 bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
                <h2 className="font-headline font-bold text-on-surface">Lojas Ativas</h2>
                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">{stores.length} Unidades</span>
              </div>
              <div className="divide-y divide-outline-variant">
                {stores.map(store => (
                  <div 
                    key={store.id} 
                    className="p-6 flex items-center justify-between hover:bg-surface-container-low transition-all group"
                  >
                    <div 
                      className="flex items-center gap-4 cursor-pointer flex-1"
                      onClick={() => onSelectStore(store.id, store.name)}
                    >
                      <div className="bg-primary/10 p-3 rounded-2xl text-primary group-hover:bg-primary group-hover:text-on-primary transition-all duration-300">
                        <Store size={24} />
                      </div>
                      <div>
                        <p className="font-headline font-bold text-on-surface text-lg">{store.name}</p>
                        <p className="text-[10px] font-bold font-label text-on-surface-variant uppercase tracking-widest">ID: {store.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => onSelectStore(store.id, store.name)}
                        className="flex items-center gap-2 text-primary font-bold text-sm hover:gap-3 transition-all"
                      >
                        Gerenciar
                        <ChevronRight size={20} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setStoreToDelete({id: store.id, name: store.name}); }}
                        className="p-2.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded-xl transition-all"
                        title="Excluir Loja"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
                {stores.length === 0 && (
                  <div className="p-20 text-center text-on-surface-variant">
                    <Store size={64} className="mx-auto mb-4 opacity-10" />
                    <p className="font-medium">Nenhuma loja cadastrada ainda.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : activeTab === 'users' ? (
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
        ) : activeTab === 'finance' ? (
          <section className="flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-container-lowest p-6 rounded-[2rem] shadow-sm border border-outline-variant">
              <div>
                <h2 className="text-2xl font-headline font-bold text-on-surface flex items-center gap-2">
                  <BarChart3 size={28} className="text-primary" />
                  Visão Geral Financeira
                </h2>
                <p className="text-on-surface-variant text-sm mt-1">Acompanhamento de todas as unidades</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={financeStoreFilter}
                  onChange={(e) => setFinanceStoreFilter(e.target.value)}
                  className="bg-surface-container-low border border-outline-variant text-on-surface text-sm rounded-xl focus:ring-primary focus:border-primary block w-full p-2.5 font-bold"
                >
                  <option value="all">Todas as Lojas</option>
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>

                <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant">
                  <button 
                    onClick={() => setDateFilter('today')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${dateFilter === 'today' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}
                  >
                    Hoje
                  </button>
                  <button 
                    onClick={() => setDateFilter('week')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${dateFilter === 'week' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}
                  >
                    Semana
                  </button>
                  <button 
                    onClick={() => setDateFilter('month')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${dateFilter === 'month' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}
                  >
                    Mês
                  </button>
                  <button 
                    onClick={() => setDateFilter('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${dateFilter === 'all' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant hover:bg-surface-container-highest'}`}
                  >
                    Tudo
                  </button>
                </div>
              </div>
            </div>

            {/* Dashboard Financeiro */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm border border-outline-variant flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-primary-container text-primary rounded-2xl"><TrendingUp size={24} /></div>
                  <p className="text-sm font-bold font-label text-on-surface-variant uppercase tracking-widest">Receita Total</p>
                </div>
                <p className="text-4xl font-headline font-bold text-on-surface">{formatCurrency(stats.revenue)}</p>
              </div>
              <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm border border-outline-variant flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-error-container text-error rounded-2xl"><TrendingDown size={24} /></div>
                  <p className="text-sm font-bold font-label text-on-surface-variant uppercase tracking-widest">Despesas Pagas</p>
                </div>
                <p className="text-4xl font-headline font-bold text-on-surface">{formatCurrency(stats.expenses)}</p>
              </div>
              <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm border border-outline-variant flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-secondary-container text-on-secondary-container rounded-2xl"><Wallet size={24} /></div>
                  <p className="text-sm font-bold font-label text-on-surface-variant uppercase tracking-widest">Lucro Líquido</p>
                </div>
                <p className={`text-4xl font-headline font-bold ${stats.profit >= 0 ? 'text-primary' : 'text-error'}`}>
                  {formatCurrency(stats.profit)}
                </p>
              </div>
            </div>

            <div className={`grid grid-cols-1 ${financeStoreFilter === 'all' ? 'lg:grid-cols-2' : ''} gap-6`}>
              {/* Gráfico por Loja */}
              {financeStoreFilter === 'all' && (
                <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm border border-outline-variant">
                  <h3 className="font-headline font-bold text-on-surface mb-6 flex items-center gap-2">
                    <BarChart3 size={20} className="text-primary" />
                    Desempenho por Loja
                  </h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.byStore}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <RechartsTooltip 
                          formatter={(value: any) => formatCurrency(Number(value))}
                          contentStyle={{ borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="receita" name="Receita" fill="#4a148c" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="lucro" name="Lucro" fill="#ff4081" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Gráfico de Despesas por Categoria */}
              <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm border border-outline-variant">
                <h3 className="font-headline font-bold text-on-surface mb-6 flex items-center gap-2">
                  <PieChartIcon size={20} className="text-error" />
                  Despesas por Categoria
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(stats.expensesByCategory).map(([name, value]) => ({ name, value: Number(value) })).filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {Object.entries(stats.expensesByCategory).filter(([_, value]) => Number(value) > 0).map((entry, index) => {
                          const colors = ['#ff4081', '#4a148c', '#06b6d4', '#f59e0b', '#10b981', '#6366f1'];
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                        })}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: any) => formatCurrency(Number(value))}
                        contentStyle={{ borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfico de Métodos de Pagamento */}
              <div className={`bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm border border-outline-variant ${financeStoreFilter === 'all' ? 'lg:col-span-2' : ''}`}>
                <h3 className="font-headline font-bold text-on-surface mb-6 flex items-center gap-2">
                  <PieChartIcon size={20} className="text-primary" />
                  Meios de Pagamento
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'PIX', value: stats.byMethod.pix, color: '#06b6d4' },
                          { name: 'Dinheiro', value: stats.byMethod.cash, color: '#10b981' },
                          { name: 'Crédito', value: stats.byMethod.credit, color: '#6366f1' },
                          { name: 'Débito', value: stats.byMethod.debit, color: '#f59e0b' }
                        ].filter(d => d.value > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[
                          { name: 'PIX', value: stats.byMethod.pix, color: '#06b6d4' },
                          { name: 'Dinheiro', value: stats.byMethod.cash, color: '#10b981' },
                          { name: 'Crédito', value: stats.byMethod.credit, color: '#6366f1' },
                          { name: 'Débito', value: stats.byMethod.debit, color: '#f59e0b' }
                        ].filter(d => d.value > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: any) => formatCurrency(Number(value))}
                        contentStyle={{ borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Contas a Pagar (Aprovações) */}
            <div className="bg-surface-container-lowest rounded-[2rem] shadow-sm border border-outline-variant overflow-hidden">
              <div className="p-6 bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
                <h2 className="font-headline font-bold text-on-surface flex items-center gap-2">
                  <Clock size={20} className="text-error" />
                  Contas a Pagar (Pendentes)
                </h2>
                <span className="bg-error-container text-error text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full">
                  {pendingExpenses.length} pendentes
                </span>
              </div>
              
              <div className="divide-y divide-outline-variant">
                {pendingExpenses.length === 0 ? (
                  <div className="p-12 text-center text-on-surface-variant">
                    <CheckCircle size={48} className="mx-auto mb-4 text-primary opacity-50" />
                    <p className="font-medium">Nenhuma despesa pendente de aprovação.</p>
                  </div>
                ) : (
                  pendingExpenses.map(exp => (
                    <div key={exp.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-surface-container-low transition-colors">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] font-bold bg-primary-container text-primary px-2 py-1 rounded-md uppercase tracking-widest">
                            {exp.storeName}
                          </span>
                          <span className="text-xs font-medium text-on-surface-variant flex items-center gap-1">
                            <Calendar size={12} />
                            Venc: {new Date(exp.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                          </span>
                        </div>
                        <p className="font-headline font-bold text-lg text-on-surface flex items-center gap-2">
                          {exp.description}
                          {exp.isRecurring && <span className="text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full uppercase tracking-widest">Recorrente</span>}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-widest ${exp.paymentSource === 'cash_drawer' ? 'bg-error-container text-error' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                            {exp.paymentSource === 'cash_drawer' ? 'Sai do Caixa' : 'Externo/Geral'}
                          </span>
                          {exp.category && (
                            <span className="text-[10px] font-bold bg-surface-container-highest text-on-surface-variant px-2 py-1 rounded-md uppercase tracking-widest">
                              {exp.category}
                            </span>
                          )}
                          {exp.notes && <p className="text-sm text-on-surface-variant italic">{exp.notes}</p>}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end gap-6">
                        <p className="text-2xl font-headline font-bold text-error">
                          {formatCurrency(exp.amount)}
                        </p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => updateExpenseStatus(exp.storeId, exp.id, 'paid')}
                            className="p-3 bg-primary text-on-primary hover:bg-primary/90 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
                            title="Marcar como Pago"
                          >
                            <CheckCircle size={20} />
                            <span className="text-sm font-bold hidden sm:inline">Pagar</span>
                          </button>
                          <button 
                            onClick={() => updateExpenseStatus(exp.storeId, exp.id, 'cancelled')}
                            className="p-3 bg-error-container text-error hover:bg-error-container/80 rounded-xl transition-all active:scale-95 flex items-center gap-2"
                            title="Cancelar/Rejeitar"
                          >
                            <XCircle size={20} />
                            <span className="text-sm font-bold hidden sm:inline">Rejeitar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Histórico de Despesas Pagas */}
            <div className="bg-surface-container-lowest rounded-[2rem] shadow-sm border border-outline-variant overflow-hidden">
              <div className="p-6 bg-surface-container-low border-b border-outline-variant">
                <h2 className="font-headline font-bold text-on-surface flex items-center gap-2">
                  <CheckCircle size={20} className="text-primary" />
                  Histórico de Despesas (Últimas 10)
                </h2>
              </div>
              <div className="divide-y divide-outline-variant">
                {allExpenses.filter(e => e.status !== 'pending').slice(0, 10).length === 0 ? (
                  <div className="p-12 text-center text-on-surface-variant">
                    <p className="font-medium">Nenhum histórico de despesas.</p>
                  </div>
                ) : (
                  allExpenses.filter(e => e.status !== 'pending').slice(0, 10).map(exp => (
                    <div key={exp.id} className="p-6 flex justify-between items-center hover:bg-surface-container-low transition-colors">
                      <div>
                        <p className="font-headline font-bold text-on-surface flex items-center gap-2">
                          {exp.description} 
                          <span className="text-[10px] bg-primary-container text-primary px-2 py-0.5 rounded-md uppercase tracking-widest">{exp.storeName}</span>
                          {exp.isRecurring && <span className="text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full uppercase tracking-widest">Recorrente</span>}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <p className="text-xs font-medium text-on-surface-variant flex items-center gap-1">
                            <Calendar size={12} />
                            Venc: {new Date(exp.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                          </p>
                          <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">• {exp.paymentSource === 'cash_drawer' ? 'Caixa' : 'Geral'}</span>
                          {exp.category && (
                            <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">• {exp.category}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-headline font-bold text-lg text-on-surface">{formatCurrency(exp.amount)}</p>
                          <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-widest ${exp.status === 'paid' ? 'bg-primary-container/50 text-primary' : 'bg-error-container/50 text-error'}`}>
                            {exp.status === 'paid' ? 'Pago' : 'Cancelado'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setEditingExpense({ ...exp })}
                            className="p-2 text-primary hover:bg-primary-container rounded-xl transition-colors"
                            title="Editar Despesa"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => setExpenseToDelete({storeId: exp.storeId, id: exp.id})}
                            className="p-2 text-error hover:bg-error-container rounded-xl transition-colors"
                            title="Excluir Despesa"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Histórico de Fechamentos (Recebíveis) */}
            <div className="bg-surface-container-lowest rounded-[2rem] shadow-sm border border-outline-variant overflow-hidden">
              <div className="p-6 bg-surface-container-low border-b border-outline-variant">
                <h2 className="font-headline font-bold text-on-surface flex items-center gap-2">
                  <DollarSign size={20} className="text-primary" />
                  Histórico de Fechamentos (Recebíveis)
                </h2>
              </div>
              <div className="divide-y divide-outline-variant">
                {(() => {
                  let closings = Object.values(closingsByStore).flat();
                  if (financeStoreFilter !== 'all') {
                    closings = closingsByStore[financeStoreFilter] || [];
                  }
                  const sortedClosings = closings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);
                  
                  if (sortedClosings.length === 0) {
                    return (
                      <div className="p-12 text-center text-on-surface-variant">
                        <p className="font-medium">Nenhum fechamento registrado.</p>
                      </div>
                    );
                  }

                  return sortedClosings.map(closing => {
                    const store = stores.find(s => s.id === closing.storeId);
                    return (
                      <div key={closing.id} className="p-6 flex justify-between items-center hover:bg-surface-container-low transition-colors">
                        <div>
                          <p className="font-headline font-bold text-on-surface flex items-center gap-2">
                            Fechamento {new Date(closing.createdAt).toLocaleDateString('pt-BR')}
                            <span className="text-[10px] bg-primary-container text-primary px-2 py-0.5 rounded-md uppercase tracking-widest">{store ? store.name : 'Desconhecida'}</span>
                          </p>
                          <div className="flex gap-4 text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mt-2">
                            <span>PIX: {formatCurrency(closing.pix)}</span>
                            <span>Cartão: {formatCurrency((closing.credit || 0) + (closing.debit || 0))}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="font-headline font-bold text-lg text-primary">{formatCurrency(closing.total)}</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => setEditingClosing({ ...closing })}
                              className="p-2 text-primary hover:bg-primary-container rounded-xl transition-colors"
                              title="Editar Fechamento"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => setClosingToDelete({storeId: closing.storeId || '', id: closing.id})}
                              className="p-2 text-error hover:bg-error-container rounded-xl transition-colors"
                              title="Excluir Fechamento"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Conferência de Fluxo de Caixa */}
            <div className="bg-surface-container-lowest rounded-[2rem] shadow-sm border border-outline-variant overflow-hidden">
              <div className="p-6 bg-surface-container-low border-b border-outline-variant">
                <h2 className="font-headline font-bold text-on-surface flex items-center gap-2">
                  <ShieldCheck size={20} className="text-primary" />
                  Conferência de Fluxo de Caixa (Gestão)
                </h2>
              </div>
              <div className="divide-y divide-outline-variant">
                {(() => {
                  let sessions = Object.values(sessionsByStore).flat();
                  if (financeStoreFilter !== 'all') {
                    sessions = sessionsByStore[financeStoreFilter] || [];
                  }
                  const sortedSessions = sessions.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()).slice(0, 15);

                  if (sortedSessions.length === 0) {
                    return (
                      <div className="p-12 text-center text-on-surface-variant">
                        <p className="font-medium">Nenhum fluxo de caixa registrado.</p>
                      </div>
                    );
                  }

                  return sortedSessions.map(session => {
                    const openingCash = (session.openingBills || 0) + (session.openingCoins || 0);
                    const closingCash = (session.closingBills || 0) + (session.closingCoins || 0);
                    const sangria = session.sangria || 0;
                    const cashSales = session.cashSales || 0;
                    
                    // Find expenses for this store on this day that came from cash drawer
                    const dayExpenses = expensesByStore[session.storeId]?.filter(e => 
                      e.createdAt.startsWith(session.date) && e.status === 'paid' && e.paymentSource === 'cash_drawer'
                    ) || [];
                    const totalExpenses = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

                    const expectedCash = openingCash + cashSales - totalExpenses - sangria;
                    const difference = session.discrepancy !== undefined ? session.discrepancy : (closingCash - expectedCash);
                    const isClosed = session.status === 'closed';
                    const store = stores.find(s => s.id === session.storeId);

                    return (
                      <div key={session.id} className="p-6 hover:bg-surface-container-low transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-[10px] font-bold bg-primary-container text-primary px-2 py-1 rounded-md uppercase tracking-widest">
                                {store ? store.name : 'Desconhecida'}
                              </span>
                              <span className="text-xs font-medium text-on-surface-variant flex items-center gap-1">
                                <Calendar size={12} />
                                {new Date(session.openedAt).toLocaleDateString('pt-BR')}
                              </span>
                              <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-widest ${session.status === 'open' ? 'bg-primary-container/50 text-primary' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                                {session.status === 'open' ? 'Aberto' : 'Fechado'}
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant font-medium">Aberto por: {users.find(u => u.id === session.openedBy)?.email || '...'}</p>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setEditingSession({ ...session })}
                                className="p-2 text-primary hover:bg-primary-container rounded-xl transition-colors"
                                title="Editar Registro"
                              >
                                <Edit size={18} />
                              </button>
                              <button 
                                onClick={() => setSessionToDelete({storeId: session.storeId, id: session.id})}
                                className="p-2 text-error hover:bg-error-container rounded-xl transition-colors"
                                title="Excluir Registro"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                            {isClosed && (
                              <div className={`text-right p-3 rounded-xl border ${difference === 0 ? 'bg-green-50 border-green-200' : difference > 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                                <p className={`text-[10px] uppercase tracking-widest font-bold mb-1 ${difference === 0 ? 'text-green-700' : difference > 0 ? 'text-blue-700' : 'text-red-700'}`}>Diferença (Quebra)</p>
                                <p className={`text-xl font-headline font-bold ${difference === 0 ? 'text-green-700' : difference > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                  {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant">
                          <div>
                            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">Abertura</p>
                            <p className="text-sm font-headline font-bold text-on-surface">{formatCurrency(openingCash)}</p>
                            <p className="text-[10px] text-on-surface-variant mt-1">Reserva: {formatCurrency(session.openingChangeReserve)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">Vendas Dinheiro</p>
                            <p className="text-sm font-bold text-green-600">+{formatCurrency(cashSales)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">Gastos/Sangria</p>
                            <p className="text-sm font-headline font-bold text-error">-{formatCurrency(totalExpenses + sangria)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-1">Esperado em Caixa</p>
                            <p className="text-sm font-headline font-bold text-on-surface">{formatCurrency(expectedCash)}</p>
                          </div>
                        </div>

                        {isClosed && (
                          <div className="mt-4 flex flex-wrap gap-4 text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">
                            <span className="bg-surface-container-highest px-2 py-1 rounded">PIX: <strong className="text-primary">{formatCurrency(session.pix)}</strong></span>
                            <span className="bg-surface-container-highest px-2 py-1 rounded">Cartões: <strong className="text-primary">{formatCurrency((session.credit || 0) + (session.debit || 0))}</strong></span>
                            <span className="bg-surface-container-highest px-2 py-1 rounded">Reserva Final: <strong className="text-primary">{formatCurrency(session.closingChangeReserve)}</strong></span>
                            <span className="bg-surface-container-highest px-2 py-1 rounded">Sangria: <strong className="text-primary">{formatCurrency(session.sangria)}</strong></span>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </section>
        ) : null}
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

        {sessionToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertTriangle size={28} />
                <h3 className="text-xl font-bold">Excluir Registro?</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja excluir este registro de fluxo de caixa? 
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setSessionToDelete(null)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDeleteSession}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {expenseToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertTriangle size={28} />
                <h3 className="text-xl font-bold">Excluir Despesa?</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setExpenseToDelete(null)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDeleteExpense}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {closingToDelete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertTriangle size={28} />
                <h3 className="text-xl font-bold">Excluir Fechamento?</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Tem certeza que deseja excluir este fechamento de caixa? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setClosingToDelete(null)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDeleteClosing}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                >
                  Sim, Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {editingClosing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Edit className="text-blue-600" />
                  Editar Fechamento
                </h3>
                <button onClick={() => setEditingClosing(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Data de Criação</label>
                  <input 
                    type="datetime-local" 
                    value={editingClosing.createdAt.slice(0, 16)}
                    onChange={(e) => setEditingClosing({...editingClosing, createdAt: new Date(e.target.value).toISOString()})}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">PIX (R$)</label>
                    <input 
                      type="number" 
                      value={editingClosing.pix}
                      onChange={(e) => {
                        const pix = Number(e.target.value);
                        setEditingClosing({...editingClosing, pix, total: pix + (editingClosing.card || 0)});
                      }}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Cartão (R$)</label>
                    <input 
                      type="number" 
                      value={editingClosing.card}
                      onChange={(e) => {
                        const card = Number(e.target.value);
                        setEditingClosing({...editingClosing, card, total: card + (editingClosing.pix || 0)});
                      }}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs font-bold text-blue-600 uppercase">Total Calculado</p>
                  <p className="text-xl font-black text-blue-700">{formatCurrency(editingClosing.total)}</p>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setEditingClosing(null)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveClosingEdit}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {editingExpense && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Edit className="text-blue-600" />
                  Editar Despesa
                </h3>
                <button onClick={() => setEditingExpense(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Descrição</label>
                  <input 
                    type="text" 
                    value={editingExpense.description}
                    onChange={(e) => setEditingExpense({...editingExpense, description: e.target.value})}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Valor (R$)</label>
                    <input 
                      type="number" 
                      value={editingExpense.amount}
                      onChange={(e) => setEditingExpense({...editingExpense, amount: Number(e.target.value)})}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Vencimento</label>
                    <input 
                      type="date" 
                      value={editingExpense.dueDate}
                      onChange={(e) => setEditingExpense({...editingExpense, dueDate: e.target.value})}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                    <select 
                      value={editingExpense.status}
                      onChange={(e) => setEditingExpense({...editingExpense, status: e.target.value})}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <option value="pending">Pendente</option>
                      <option value="paid">Pago</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Origem</label>
                    <select 
                      value={editingExpense.paymentSource}
                      onChange={(e) => setEditingExpense({...editingExpense, paymentSource: e.target.value})}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <option value="cash_drawer">Caixa da Loja</option>
                      <option value="external">Externo/Geral</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="edit-recurring"
                    checked={editingExpense.isRecurring}
                    onChange={(e) => setEditingExpense({...editingExpense, isRecurring: e.target.checked})}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="edit-recurring" className="text-sm text-gray-600">Despesa Recorrente</label>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Notas</label>
                  <textarea 
                    value={editingExpense.notes || ''}
                    onChange={(e) => setEditingExpense({...editingExpense, notes: e.target.value})}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg h-20"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setEditingExpense(null)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveExpenseEdit}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {editingSession && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-xl my-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Edit className="text-blue-600" />
                  Editar Registro de Caixa
                </h3>
                <button onClick={() => setEditingSession(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Data do Registro</label>
                  <input 
                    type="date" 
                    value={editingSession.date}
                    onChange={(e) => setEditingSession({...editingSession, date: e.target.value})}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
                  <select 
                    value={editingSession.status}
                    onChange={(e) => setEditingSession({...editingSession, status: e.target.value})}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <option value="open">Aberto</option>
                    <option value="closed">Fechado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Cédulas (Abertura)</label>
                  <input type="number" value={editingSession.openingBills} onChange={(e) => setEditingSession({...editingSession, openingBills: Number(e.target.value)})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Moedas (Abertura)</label>
                  <input type="number" value={editingSession.openingCoins} onChange={(e) => setEditingSession({...editingSession, openingCoins: Number(e.target.value)})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Reserva (Abertura)</label>
                  <input type="number" value={editingSession.openingChangeReserve} onChange={(e) => setEditingSession({...editingSession, openingChangeReserve: Number(e.target.value)})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg" />
                </div>
              </div>

              {editingSession.status === 'closed' && (
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-bold text-gray-700">Valores de Fechamento</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Vendas Dinheiro</label>
                      <input type="number" value={editingSession.cashSales} onChange={(e) => setEditingSession({...editingSession, cashSales: Number(e.target.value)})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">PIX</label>
                      <input type="number" value={editingSession.pix} onChange={(e) => setEditingSession({...editingSession, pix: Number(e.target.value)})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Crédito</label>
                      <input type="number" value={editingSession.credit} onChange={(e) => setEditingSession({...editingSession, credit: Number(e.target.value)})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Débito</label>
                      <input type="number" value={editingSession.debit} onChange={(e) => setEditingSession({...editingSession, debit: Number(e.target.value)})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Cédulas (Fim)</label>
                      <input type="number" value={editingSession.closingBills} onChange={(e) => setEditingSession({...editingSession, closingBills: Number(e.target.value)})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Moedas (Fim)</label>
                      <input type="number" value={editingSession.closingCoins} onChange={(e) => setEditingSession({...editingSession, closingCoins: Number(e.target.value)})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Reserva (Fim)</label>
                      <input type="number" value={editingSession.closingChangeReserve} onChange={(e) => setEditingSession({...editingSession, closingChangeReserve: Number(e.target.value)})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Sangria</label>
                      <input type="number" value={editingSession.sangria} onChange={(e) => setEditingSession({...editingSession, sangria: Number(e.target.value)})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setEditingSession(null)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveSessionEdit}
                  className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                >
                  Salvar Alterações
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
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-white/60 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Clock size={48} className="text-blue-600 animate-spin" />
              <p className="text-blue-600 font-bold animate-pulse">Carregando painel master...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ChatMaria />
    </div>
  );
}
