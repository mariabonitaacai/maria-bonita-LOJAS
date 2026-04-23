import React, { useState, useEffect, useMemo } from 'react';
import { Package, Plus, Trash2, Share2, PlusCircle, MinusCircle, DollarSign, Box, AlertTriangle, CheckCircle, Edit, Check, X, Search, RefreshCw, LogOut, ArrowLeft, ShoppingCart, Send, Bell, Settings, ClipboardCheck, Filter, Download, TrendingUp, Tag, Minus, MoreVertical, PieChart as PieChartIcon, BarChart3, ArrowRightLeft, Clock, Camera, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, storage } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFinance } from '../hooks/useFinance';
import { useInventory } from '../hooks/useInventory';
import { useCashSession } from '../hooks/useCashSession';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Image from 'next/image';
import { InventoryItem, DailyChecklist } from '../types';
import { CHECKLIST_TEMPLATE, calculateChecklistScore } from '../utils/checklistTemplate';
import { getChecklistsByStore, saveDailyChecklist } from '../services/checklistService';

export default function Inventory({ storeId, storeName, onBack }: { storeId: string, storeName: string, onBack?: () => void }) {
  const { 
    items, 
    isLoading: isInventoryLoading, 
    addItem: addItemHook, 
    updateItem: updateItemHook, 
    deleteItem: deleteItemHook, 
    resetInventory: resetInventoryHook,
    confirmTrackingUpdate,
    transferItem
  } = useInventory(storeId);
  
  const [stores, setStores] = useState<{id: string, name: string}[]>([]);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferItemData, setTransferItemData] = useState<InventoryItem | null>(null);
  const [transferFormData, setTransferFormData] = useState({ destStoreId: '', quantity: '' });

  useEffect(() => {
    const fetchStores = async () => {
      const snapshot = await getDocs(collection(db, 'stores'));
      setStores(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    };
    fetchStores();
  }, []);
  
  const [formData, setFormData] = useState({ 
    name: '', 
    quantity: 0, 
    price: '', 
    dailyConsumption: '',
    minQuantity: '',
    category: ''
  });
  const [notification, setNotification] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({ 
    name: '', 
    price: '', 
    dailyConsumption: '',
    minQuantity: '',
    category: ''
  });
  
  // Order Generator State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderDays, setOrderDays] = useState(7);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'inventory' | 'analysis' | 'finance' | 'checklist'>('inventory');
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, { quantity?: number, waste?: number }>>({});

  // Checklist State
  const [checklistData, setChecklistData] = useState<Record<string, boolean>>({});
  const [checklistItems, setChecklistItems] = useState<DailyChecklist[]>([]);
  const [checklistPhotos, setChecklistPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [isUploadingChecklist, setIsUploadingChecklist] = useState(false);
  const [isChecklistLoading, setIsChecklistLoading] = useState(true);
  
  useEffect(() => {
    if (activeTab === 'checklist') {
      setIsChecklistLoading(true);
      getChecklistsByStore(storeId).then(lists => {
        setChecklistItems(lists);
        setIsChecklistLoading(false);
      }).catch(err => {
        console.error("Erro ao carregar checklists:", err);
        showNotification("Erro ao carregar histórico de checklists.");
        setIsChecklistLoading(false);
      });
    }
  }, [activeTab, storeId]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayChecklist = useMemo(() => checklistItems.find(c => c.date === todayStr), [checklistItems, todayStr]);

  useEffect(() => {
    if (todayChecklist) {
      setChecklistData(todayChecklist.items || {});
      setExistingPhotos(todayChecklist.photos || []);
    } else {
      setChecklistData({});
      setExistingPhotos([]);
    }
  }, [todayChecklist]);

  const handleChecklistToggle = (taskId: string) => {
    setChecklistData(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = error => reject(error);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSaveChecklist = async () => {
    const score = calculateChecklistScore(checklistData);
    setIsUploadingChecklist(true);
    let uploadedUrls: string[] = [...existingPhotos];

    try {
      if (checklistPhotos.length > 0) {
        showNotification('Processando e salvando fotos...');
        for (const file of checklistPhotos) {
          const compressedBase64 = await compressImage(file);
          uploadedUrls.push(compressedBase64);
        }
      }

      await saveDailyChecklist(storeId, todayStr, {
        score,
        items: checklistData,
        photos: uploadedUrls,
        createdBy: auth.currentUser?.uid || ''
      });
      
      setChecklistPhotos([]);
      setExistingPhotos(uploadedUrls);
      showNotification('Checklist salvo com sucesso!');
      
      // Atualizar lista localmente
      getChecklistsByStore(storeId).then(setChecklistItems);
    } catch (error) {
      console.error("Erro ao salvar checklist:", error);
      showNotification('Erro ao salvar checklist.');
    } finally {
      setIsUploadingChecklist(false);
    }
  };

  // Finance State
  const [expenseData, setExpenseData] = useState({ 
    description: '', 
    amount: '', 
    dueDate: '', 
    category: '',
    notes: '', 
    paymentSource: 'cash_drawer' as 'cash_drawer' | 'external',
    paymentMethod: 'pix',
    isRecurring: false
  });
  const [closingData, setClosingData] = useState({ pix: '', credit: '', debit: '', cash: '' });
  const { expenses: recentExpenses, closings: recentClosings, isLoading: isFinanceLoading, addExpense: addExpenseHook, addClosing: addClosingHook, deleteExpense: deleteExpenseHook, deleteClosing: deleteClosingHook } = useFinance(storeId, 5);

  const {
    currentSession,
    isLoading: isSessionLoading,
    openSession: openSessionHook,
    closeSession: closeSessionHook
  } = useCashSession(storeId);

  const isAnyLoading = isInventoryLoading || isSessionLoading || isFinanceLoading;

  const [openingData, setOpeningData] = useState({ date: new Date().toISOString().split('T')[0], bills: '', coins: '', changeReserve: '' });
  const [closingFlowData, setClosingFlowData] = useState({ 
    bills: '', 
    coins: '', 
    changeReserve: '', 
    sangria: '',
    cashSales: '',
    pix: '',
    credit: '',
    debit: ''
  });

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

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
      await addItemHook({
        name: formData.name,
        quantity: Number(formData.quantity) || 0,
        waste: 0,
        price: Number(formData.price.replace(',', '.')) || 0,
        dailyConsumption: Number(formData.dailyConsumption) || 0,
        minQuantity: Number(formData.minQuantity) || 0,
        category: formData.category
      });
      setFormData({ 
        name: '', 
        quantity: 0, 
        price: '', 
        dailyConsumption: '',
        minQuantity: '',
        category: ''
      });
      setSearchTerm('');
      showNotification('Artigo adicionado com sucesso!');
    } catch (error) {
      console.error("Error adding item:", error);
      showNotification('Erro ao adicionar artigo.');
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteItemHook(id);
      showNotification('Artigo removido.');
    } catch (error) {
      console.error("Error deleting item:", error);
    }
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
      await confirmTrackingUpdate(item, field, newValue);
      
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
    setEditFormData({ 
      name: item.name, 
      price: item.price, 
      dailyConsumption: item.dailyConsumption || '',
      minQuantity: item.minQuantity || '',
      category: item.category || ''
    });
  };

  const saveEditing = async (id: string) => {
    if (!editFormData.name.trim()) {
      showNotification('O nome não pode ficar vazio.');
      return;
    }
    try {
      await updateItemHook(id, {
        name: editFormData.name,
        price: Number(String(editFormData.price).replace(',', '.')) || 0,
        dailyConsumption: Number(editFormData.dailyConsumption) || 0,
        minQuantity: Number(editFormData.minQuantity) || 0,
        category: editFormData.category
      });
      setEditingId(null);
      showNotification('Artigo atualizado com sucesso!');
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  const confirmReset = async () => {
    try {
      await resetInventoryHook();
      setIsResetModalOpen(false);
      showNotification('Inventário zerado com sucesso!');
    } catch (error) {
      console.error("Error resetting inventory:", error);
      showNotification('Erro ao zerar inventário.');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferItemData || !transferFormData.destStoreId || !transferFormData.quantity) {
      showNotification('Preencha todos os campos da transferência.');
      return;
    }

    const qty = Number(transferFormData.quantity);
    if (qty <= 0 || qty > transferItemData.quantity) {
      showNotification('Quantidade inválida para transferência.');
      return;
    }

    const destStore = stores.find(s => s.id === transferFormData.destStoreId);
    if (!destStore) return;

    try {
      await transferItem(
        destStore.id,
        destStore.name,
        transferItemData,
        qty,
        storeName,
        auth.currentUser?.uid || ''
      );
      setIsTransferModalOpen(false);
      setTransferItemData(null);
      setTransferFormData({ destStoreId: '', quantity: '' });
      showNotification('Transferência realizada com sucesso!');
    } catch (error) {
      console.error("Error transferring item:", error);
      showNotification('Erro ao transferir item.');
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

  const handleExpenseChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setExpenseData(prev => ({ ...prev, [name]: checked }));
    } else {
      setExpenseData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleClosingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setClosingData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpeningFlowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOpeningData(prev => ({ ...prev, [name]: value }));
  };

  const handleClosingFlowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setClosingFlowData(prev => ({ ...prev, [name]: value }));
  };

  const openCashSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await openSessionHook({
        date: openingData.date || new Date().toISOString().split('T')[0],
        openedBy: auth.currentUser?.uid || '',
        openingBills: Number(openingData.bills.replace(',', '.')) || 0,
        openingCoins: Number(openingData.coins.replace(',', '.')) || 0,
        openingChangeReserve: Number(openingData.changeReserve.replace(',', '.')) || 0
      });
      setOpeningData({ date: new Date().toISOString().split('T')[0], bills: '', coins: '', changeReserve: '' });
      showNotification('Caixa aberto com sucesso!');
    } catch (error) {
      console.error("Error opening cash session:", error);
      showNotification('Erro ao abrir o caixa.');
    }
  };

  const closeCashSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession) return;

    const pix = Number(closingFlowData.pix.replace(',', '.')) || 0;
    const credit = Number(closingFlowData.credit.replace(',', '.')) || 0;
    const debit = Number(closingFlowData.debit.replace(',', '.')) || 0;
    const cashSales = Number(closingFlowData.cashSales.replace(',', '.')) || 0;
    const totalReported = pix + credit + debit + cashSales;

    const closingBills = Number(closingFlowData.bills.replace(',', '.')) || 0;
    const closingCoins = Number(closingFlowData.coins.replace(',', '.')) || 0;
    const closingChangeReserve = Number(closingFlowData.changeReserve.replace(',', '.')) || 0;
    const sangria = Number(closingFlowData.sangria.replace(',', '.')) || 0;

    const initialCash = currentSession.openingBills + currentSession.openingCoins + currentSession.openingChangeReserve;
    const cashExpenses = recentExpenses
      .filter(e => e.paymentSource === 'cash_drawer' && e.status === 'paid' && new Date(e.createdAt).toDateString() === new Date().toDateString())
      .reduce((acc, e) => acc + e.amount, 0);

    const expectedCash = initialCash + cashSales - sangria - cashExpenses;
    const actualCash = closingBills + closingCoins + closingChangeReserve;
    const discrepancy = actualCash - expectedCash;

    try {
      await closeSessionHook(currentSession.id, {
        closedBy: auth.currentUser?.uid || '',
        closingBills,
        closingCoins,
        closingChangeReserve,
        sangria,
        cashSales,
        pix,
        credit,
        debit,
        totalReported,
        discrepancy
      });
      
      // Also add to legacy closings for compatibility
      await addClosingHook({
        date: currentSession.date,
        pix,
        credit,
        debit,
        cash: cashSales,
        total: totalReported,
        createdBy: auth.currentUser?.uid || ''
      });

      setClosingFlowData({ 
        bills: '', coins: '', changeReserve: '', sangria: '', 
        cashSales: '', pix: '', credit: '', debit: '' 
      });
      showNotification('Caixa fechado com sucesso!');
    } catch (error) {
      console.error("Error closing cash session:", error);
      showNotification('Erro ao fechar o caixa.');
    }
  };

  const submitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseData.description.trim() || !expenseData.amount || !expenseData.dueDate) {
      showNotification('Preencha descrição, valor e vencimento.');
      return;
    }
    try {
      await addExpenseHook({
        description: expenseData.description,
        amount: Number(expenseData.amount.replace(',', '.')) || 0,
        dueDate: expenseData.dueDate,
        category: expenseData.category,
        notes: expenseData.notes,
        paymentSource: expenseData.paymentSource,
        paymentMethod: expenseData.paymentMethod,
        isRecurring: expenseData.isRecurring,
        status: 'pending',
        createdBy: auth.currentUser?.uid || ''
      });
      setExpenseData({ 
        description: '', 
        amount: '', 
        dueDate: '', 
        category: '',
        notes: '', 
        paymentSource: 'cash_drawer',
        paymentMethod: 'pix',
        isRecurring: false
      });
      showNotification('Despesa lançada com sucesso!');
    } catch (error) {
      console.error("Error adding expense:", error);
      showNotification('Erro ao lançar despesa.');
    }
  };

  const submitClosing = async (e: React.FormEvent) => {
    e.preventDefault();
    const pix = Number(closingData.pix.replace(',', '.')) || 0;
    const credit = Number(closingData.credit.replace(',', '.')) || 0;
    const debit = Number(closingData.debit.replace(',', '.')) || 0;
    const cash = Number(closingData.cash.replace(',', '.')) || 0;
    const total = pix + credit + debit + cash;

    if (total === 0) {
      showNotification('Preencha pelo menos um valor para o fechamento.');
      return;
    }

    try {
      await addClosingHook({
        date: new Date().toISOString().split('T')[0],
        pix,
        credit,
        debit,
        cash,
        total,
        createdBy: auth.currentUser?.uid || ''
      });
      setClosingData({ pix: '', credit: '', debit: '', cash: '' });
      showNotification('Fechamento enviado com sucesso!');
    } catch (error) {
      console.error("Error adding closing:", error);
      showNotification('Erro ao enviar fechamento.');
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item: any) => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, selectedCategory]);

  const categories = useMemo(() => {
    const cats = new Set(items.map((i: any) => i.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [items]);

  const totalItems = items.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0);
  const totalValue = items.reduce((acc: number, item: any) => acc + ((Number(item.quantity) || 0) * Number(item.price)), 0);
  const totalWasteValue = items.reduce((acc: number, item: any) => acc + ((Number(item.waste) || 0) * Number(item.price)), 0);

  return (
    <div className="min-h-screen bg-background text-on-surface font-body pb-20 md:pb-10">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-outline-variant">
        <div className="flex justify-between items-center px-4 md:px-8 h-20 w-full max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-8">
            <div className="flex items-center">
              {onBack && (
                <button onClick={onBack} className="mr-4 p-2.5 rounded-xl bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-primary-container transition-all active:scale-95">
                  <ArrowLeft size={20} />
                </button>
              )}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <Image alt="Maria Bonita Açaíteria Logo" className="relative h-12 w-auto object-contain" src="https://drive.google.com/uc?export=view&id=1S9fEzFPkZK76y6kAzFRoRXTDaU2jeDwe" width={120} height={48} referrerPolicy="no-referrer" />
              </div>
            </div>
            <nav className="hidden md:flex p-1.5 bg-surface-container-low rounded-2xl border border-outline-variant">
              <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 rounded-xl font-headline font-bold text-xs tracking-wider uppercase transition-all ${activeTab === 'inventory' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-primary'}`}>Estoque</button>
              <button onClick={() => setActiveTab('analysis')} className={`px-4 py-2 rounded-xl font-headline font-bold text-xs tracking-wider uppercase transition-all ${activeTab === 'analysis' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-primary'}`}>Inteligência</button>
              <button onClick={() => setActiveTab('finance')} className={`px-4 py-2 rounded-xl font-headline font-bold text-xs tracking-wider uppercase transition-all ${activeTab === 'finance' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-primary'}`}>Financeiro</button>
              <button onClick={() => setActiveTab('checklist')} className={`px-4 py-2 rounded-xl font-headline font-bold text-xs tracking-wider uppercase transition-all ${activeTab === 'checklist' ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-primary'}`}>Checklist</button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button className="p-2.5 rounded-xl text-on-surface-variant hover:text-primary hover:bg-primary-container transition-all"><Bell size={20} /></button>
              <button onClick={() => auth.signOut()} title="Sair" className="p-2.5 rounded-xl text-on-surface-variant hover:text-error hover:bg-error-container transition-all"><LogOut size={20} /></button>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center font-headline font-bold shadow-lg shadow-primary/20">
              {auth.currentUser?.email?.[0].toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 md:px-8 py-10 space-y-12">
        <section className="flex flex-col md:flex-row justify-between items-center gap-8 bg-surface-container-lowest p-8 rounded-[2.5rem] border border-outline-variant shadow-sm">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center text-on-primary shadow-xl shadow-primary/30 rotate-3">
              <Package size={32} />
            </div>
            <div>
              <span className="text-primary font-bold tracking-[0.2em] text-[10px] uppercase">Controle de Unidade</span>
              <h2 className="text-4xl font-bold font-headline tracking-tight text-on-surface mt-1">{storeName}</h2>
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            {activeTab === 'inventory' && (
              <button onClick={openOrderModal} className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-primary text-on-primary font-bold rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-95">
                <ClipboardCheck size={22} />
                Gerar Pedido
              </button>
            )}
            <div className="md:hidden flex-1 flex bg-surface-container-low rounded-2xl p-1 border border-outline-variant">
              <button onClick={() => setActiveTab('inventory')} className={`flex-1 py-3 text-[10px] font-bold rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant'}`}>Inv.</button>
              <button onClick={() => setActiveTab('analysis')} className={`flex-1 py-3 text-[10px] font-bold rounded-xl transition-all ${activeTab === 'analysis' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant'}`}>Análise</button>
              <button onClick={() => setActiveTab('finance')} className={`flex-1 py-3 text-[10px] font-bold rounded-xl transition-all ${activeTab === 'finance' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant'}`}>Caixa</button>
              <button onClick={() => setActiveTab('checklist')} className={`flex-1 py-3 text-[10px] font-bold rounded-xl transition-all ${activeTab === 'checklist' ? 'bg-primary text-on-primary shadow-md' : 'text-on-surface-variant'}`}>Check</button>
            </div>
          </div>
        </section>

        {activeTab === 'inventory' && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface-container-lowest p-8 rounded-2xl flex flex-col justify-between border border-outline-variant group hover:border-primary transition-all duration-300 shadow-sm hover:shadow-md">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-primary-container rounded-xl text-primary">
                  <Package size={24} />
                </div>
                <span className="text-on-surface-variant text-[10px] font-bold font-label tracking-[0.2em] uppercase">Volume Total</span>
              </div>
              <div className="mt-8">
                <div className="text-5xl font-headline font-bold text-on-surface tracking-tighter">{totalItems.toFixed(2).replace('.00', '')}</div>
                <div className="text-xs text-on-surface-variant mt-2 font-medium flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                  Insumos Ativos
                </div>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-8 rounded-2xl flex flex-col justify-between border border-outline-variant group hover:border-secondary transition-all duration-300 shadow-sm hover:shadow-md">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-secondary-container rounded-xl text-on-secondary-container">
                  <DollarSign size={24} />
                </div>
                <span className="text-on-surface-variant text-[10px] font-bold font-label tracking-[0.2em] uppercase">Ativo Corrente</span>
              </div>
              <div className="mt-8">
                <div className="text-5xl font-headline font-bold text-on-surface tracking-tighter">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}</div>
                <div className="text-xs text-on-surface-variant mt-2 font-medium flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary"></div>
                  Valor em Estoque
                </div>
              </div>
            </div>
            <div className="bg-surface-container-lowest p-8 rounded-2xl flex flex-col justify-between border border-outline-variant group hover:border-error transition-all duration-300 shadow-sm hover:shadow-md">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-error-container rounded-xl text-error">
                  <Trash2 size={24} />
                </div>
                <span className="text-on-surface-variant text-[10px] font-bold font-label tracking-[0.2em] uppercase">Perda Operacional</span>
              </div>
              <div className="mt-8">
                <div className="text-5xl font-headline font-bold text-on-surface tracking-tighter">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalWasteValue)}</div>
                <div className="text-xs text-on-surface-variant mt-2 font-medium flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-error"></div>
                  Prejuízo (Descarte)
                </div>
              </div>
            </div>
          </section>
        )}

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
                    <input name="name" value={formData.name} onChange={handleInputChange} className="w-full bg-surface-container-highest border-b-2 border-outline-variant focus:border-primary border-t-0 border-x-0 rounded-t-lg px-4 py-3 text-sm focus:ring-0 transition-colors outline-none" placeholder="Ex: Polpa de Açaí 10L" type="text" required/>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold font-label text-on-surface-variant uppercase tracking-wider ml-1">Categoria</label>
                    <input name="category" value={formData.category} onChange={handleInputChange} list="categories-list" className="w-full bg-surface-container-highest border-b-2 border-outline-variant focus:border-primary border-t-0 border-x-0 rounded-t-lg px-4 py-3 text-sm focus:ring-0 outline-none" placeholder="Ex: Insumos, Embalagens" type="text"/>
                    <datalist id="categories-list">
                      {categories.filter(c => c !== 'all').map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold font-label text-on-surface-variant uppercase tracking-wider ml-1">Qtd Inicial</label>
                      <input name="quantity" value={formData.quantity} onChange={handleInputChange} step="0.01" min="0" className="w-full bg-surface-container-highest border-b-2 border-outline-variant focus:border-primary border-t-0 border-x-0 rounded-t-lg px-4 py-3 text-sm focus:ring-0 outline-none" placeholder="0" type="number" required/>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold font-label text-on-surface-variant uppercase tracking-wider ml-1">Preço Unit.</label>
                      <input name="price" value={formData.price} onChange={handleInputChange} step="0.01" min="0" className="w-full bg-surface-container-highest border-b-2 border-outline-variant focus:border-primary border-t-0 border-x-0 rounded-t-lg px-4 py-3 text-sm focus:ring-0 outline-none" placeholder="0.00" type="number" required/>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold font-label text-on-surface-variant uppercase tracking-wider ml-1">Consumo Diário</label>
                      <input name="dailyConsumption" value={formData.dailyConsumption} onChange={handleInputChange} step="0.01" min="0" className="w-full bg-surface-container-highest border-b-2 border-outline-variant focus:border-primary border-t-0 border-x-0 rounded-t-lg px-4 py-3 text-sm focus:ring-0 outline-none" placeholder="0.00" type="number"/>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold font-label text-on-surface-variant uppercase tracking-wider ml-1">Estoque Mín.</label>
                      <input name="minQuantity" value={formData.minQuantity} onChange={handleInputChange} step="0.01" min="0" className="w-full bg-surface-container-highest border-b-2 border-outline-variant focus:border-primary border-t-0 border-x-0 rounded-t-lg px-4 py-3 text-sm focus:ring-0 outline-none" placeholder="0.00" type="number"/>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-primary text-on-primary font-bold py-4 rounded-lg mt-4 shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex justify-center items-center gap-2">
                    <Plus size={20} />
                    Adicionar ao Inventário
                  </button>
                </form>
              </div>
              <div className="relative h-64 rounded-xl overflow-hidden group hidden md:block">
                <Image alt="Organization" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800&auto=format&fit=crop" fill referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent flex flex-col justify-end p-6">
                  <p className="text-white font-headline font-bold text-lg">Otimização Maria Bonita</p>
                  <p className="text-white/70 text-xs">Controle de validade e desperdício de insumos em tempo real.</p>
                </div>
              </div>
            </aside>

            <section className="xl:col-span-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                <h3 className="text-2xl font-headline font-extrabold tracking-tight">Itens em Estoque</h3>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <div className="flex gap-2">
                    <select 
                      value={selectedCategory} 
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-surface-container-high border border-outline-variant/50 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    >
                      <option value="all">Todas Categorias</option>
                      {categories.filter(c => c !== 'all').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="relative flex-1 sm:w-64">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      className="w-full bg-surface-container-high border border-outline-variant/50 rounded-full pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all" 
                      placeholder="Pesquisar produto..." 
                      type="text"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={shareViaWhatsApp} title="Exportar/Compartilhar" className="p-2 text-on-surface-variant hover:bg-surface-container rounded-lg transition-colors"><Download size={20} /></button>
                    <button onClick={() => setIsResetModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-error-container/20 text-error font-bold rounded-lg hover:bg-error-container/30 transition-colors text-sm">
                      <RefreshCw size={18} />
                      Zerar Tudo
                    </button>
                  </div>
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
                      
                      return (
                        <motion.div key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface-container-lowest p-6 rounded-xl flex flex-col lg:flex-row items-center gap-6 lg:gap-8 border border-transparent transition-shadow hover:shadow-xl hover:shadow-purple-100/50 hover:border-primary/10">
                          {editingId === item.id ? (
                            <div className="flex-1 w-full flex flex-col gap-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-on-surface-variant uppercase ml-1">Nome do Produto</label>
                                  <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="w-full p-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-on-surface-variant uppercase ml-1">Categoria</label>
                                  <input type="text" list="categories" value={editFormData.category} onChange={(e) => setEditFormData({...editFormData, category: e.target.value})} className="w-full p-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm" placeholder="Ex: Insumos, Embalagens" />
                                  <datalist id="categories">
                                    {categories.filter(c => c !== 'all').map(c => <option key={c} value={c} />)}
                                  </datalist>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-on-surface-variant uppercase ml-1">Preço (R$)</label>
                                  <input type="number" step="0.01" value={editFormData.price} onChange={(e) => setEditFormData({...editFormData, price: e.target.value})} className="w-full p-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-on-surface-variant uppercase ml-1">Consumo Médio</label>
                                  <input type="number" step="0.01" value={editFormData.dailyConsumption} onChange={(e) => setEditFormData({...editFormData, dailyConsumption: e.target.value})} className="w-full p-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-on-surface-variant uppercase ml-1">Estoque Mínimo</label>
                                  <input type="number" step="0.01" value={editFormData.minQuantity} onChange={(e) => setEditFormData({...editFormData, minQuantity: e.target.value})} className="w-full p-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm" />
                                </div>
                              </div>
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => saveEditing(item.id)} className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:brightness-110 transition-all text-sm font-bold">
                                  <CheckCircle size={18} /> Salvar
                                </button>
                                <button onClick={() => setEditingId(null)} className="flex items-center gap-2 px-4 py-2 bg-surface-container-highest text-on-surface-variant rounded-lg hover:bg-surface-container transition-all text-sm font-bold">
                                  <X size={18} /> Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1 w-full min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                  <h4 className="text-lg font-bold truncate">{item.name}</h4>
                                  {item.category && (
                                    <span className="bg-surface-container-highest text-on-surface-variant text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">{item.category}</span>
                                  )}
                                  {(Number(item.quantity) || 0) <= (Number(item.minQuantity) || 0) ? (
                                    <span className="bg-error text-on-error text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter whitespace-nowrap flex items-center gap-1">
                                      <AlertTriangle size={10} /> Crítico
                                    </span>
                                  ) : (Number(item.quantity) || 0) <= (Number(item.minQuantity) || 0) * 1.5 ? (
                                    <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter whitespace-nowrap">Atenção</span>
                                  ) : (
                                    <span className="bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter whitespace-nowrap">OK</span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-on-surface-variant font-medium">
                                  <span className="flex items-center gap-1"><TrendingUp size={14} /> Consumo: {consumption.toFixed(2)}/dia</span>
                                  <span className="flex items-center gap-1"><Tag size={14} /> Preço: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}</span>
                                  {item.minQuantity > 0 && <span className="flex items-center gap-1 text-error/80"><AlertTriangle size={14} /> Mínimo: {item.minQuantity}</span>}
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
                                  <button onClick={() => {
                                    setTransferItemData(item);
                                    setIsTransferModalOpen(true);
                                  }} className="text-on-surface-variant hover:text-blue-600 transition-colors" title="Transferir para outra loja">
                                    <ArrowRightLeft size={18} />
                                  </button>
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
        ) : activeTab === 'analysis' ? (
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
        ) : activeTab === 'finance' ? (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Lançar Despesa */}
            <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm border border-outline-variant">
              <h3 className="text-2xl font-headline font-bold tracking-tight mb-2 flex items-center gap-3">
                <div className="p-3 bg-error-container text-error rounded-2xl"><MinusCircle size={24} /></div>
                Lançar Despesa
              </h3>
              <p className="text-sm text-on-surface-variant mb-8 font-medium">Registre contas a pagar, compras de insumos ou pagamentos de fornecedores.</p>
              
              <form onSubmit={submitExpense} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold font-label text-on-surface-variant uppercase tracking-widest ml-1">Descrição</label>
                  <input name="description" value={expenseData.description} onChange={handleExpenseChange} className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="Ex: Compra de Gelo, Conta de Luz" type="text" required/>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold font-label text-on-surface-variant uppercase tracking-widest ml-1">Valor (R$)</label>
                    <input name="amount" value={expenseData.amount} onChange={handleExpenseChange} step="0.01" min="0" className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="0.00" type="number" required/>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold font-label text-on-surface-variant uppercase tracking-widest ml-1">Vencimento</label>
                    <input name="dueDate" value={expenseData.dueDate} onChange={handleExpenseChange} className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" type="date" required/>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold font-label text-on-surface-variant uppercase tracking-widest ml-1">Categoria</label>
                    <select name="category" value={expenseData.category} onChange={handleExpenseChange} className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" required>
                      <option value="" disabled>Selecione...</option>
                      <option value="Fornecedores">Fornecedores</option>
                      <option value="Contas Fixas">Contas Fixas (Água, Luz, Net)</option>
                      <option value="Salários">Salários / Diárias</option>
                      <option value="Manutenção">Manutenção</option>
                      <option value="Impostos">Impostos / Taxas</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold font-label text-on-surface-variant uppercase tracking-widest ml-1">Origem do Pagamento</label>
                    <select name="paymentSource" value={expenseData.paymentSource} onChange={handleExpenseChange} className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                      <option value="cash_drawer">Caixa da Loja (Gaveta)</option>
                      <option value="external">Externo / Geral (Empresa)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold font-label text-on-surface-variant uppercase tracking-widest ml-1">Método de Pagamento</label>
                    <select name="paymentMethod" value={expenseData.paymentMethod} onChange={handleExpenseChange} className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                      <option value="pix">PIX</option>
                      <option value="cash">Dinheiro em Espécie</option>
                      <option value="transfer">Transferência Bancária</option>
                      <option value="credit">Cartão de Crédito</option>
                      <option value="debit">Cartão de Débito</option>
                      <option value="other">Outro</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-surface-container-low p-4 rounded-2xl border border-outline-variant">
                  <input 
                    type="checkbox" 
                    id="isRecurring" 
                    name="isRecurring" 
                    checked={expenseData.isRecurring} 
                    onChange={handleExpenseChange}
                    className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                  <label htmlFor="isRecurring" className="text-sm font-bold text-on-surface-variant cursor-pointer">Despesa Recorrente (Mensal)</label>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold font-label text-on-surface-variant uppercase tracking-widest ml-1">Observações (Opcional)</label>
                  <textarea name="notes" value={expenseData.notes} onChange={handleExpenseChange} className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none" placeholder="Detalhes adicionais..." rows={2}></textarea>
                </div>
                <button type="submit" className="w-full bg-error hover:bg-error/90 text-on-error font-bold py-4 rounded-2xl mt-2 shadow-lg shadow-error/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2">
                  <Plus size={20} />
                  Registrar Despesa
                </button>
              </form>

              {/* Histórico Recente de Despesas */}
              {recentExpenses.length > 0 && (
                <div className="mt-8 pt-6 border-t border-outline-variant/30">
                  <h4 className="text-sm font-bold text-on-surface-variant mb-4 uppercase tracking-wider">Lançamentos Recentes</h4>
                  <div className="space-y-3">
                    {recentExpenses.map(exp => (
                      <div key={exp.id} className="flex justify-between items-center p-4 bg-surface-container-low rounded-2xl border border-outline-variant/20">
                        <div>
                          <p className="font-headline font-bold text-sm text-on-surface">{exp.description}</p>
                          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">Venc: {new Date(exp.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <p className="font-headline font-bold text-error">{formatCurrency(exp.amount)}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${exp.status === 'pending' ? 'bg-amber-100 text-amber-800' : exp.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {exp.status === 'pending' ? 'Pendente' : exp.status === 'paid' ? 'Pago' : 'Cancelado'}
                            </span>
                            <button onClick={() => deleteExpenseHook(exp.id)} className="text-on-surface-variant hover:text-error transition-colors" title="Remover Despesa">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Controle de Fluxo de Caixa (Abertura/Fechamento) */}
            <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-sm border border-outline-variant">
              {!currentSession ? (
                <>
                  <h3 className="text-2xl font-headline font-bold tracking-tight mb-2 flex items-center gap-3">
                    <div className="p-3 bg-primary-container text-primary rounded-2xl"><CheckCircle size={24} /></div>
                    Abertura de Caixa
                  </h3>
                  <p className="text-sm text-on-surface-variant mb-8 font-medium">Informe os valores iniciais para começar o turno.</p>
                  
                  <form onSubmit={openCashSession} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold font-label text-on-surface-variant uppercase tracking-widest ml-1 flex items-center gap-1">Data da Sessão</label>
                      <input name="date" value={openingData.date || ''} onChange={handleOpeningFlowChange} type="date" className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" required/>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold font-label text-on-surface-variant uppercase tracking-widest ml-1 flex items-center gap-1">Cédulas (R$)</label>
                        <input name="bills" value={openingData.bills} onChange={handleOpeningFlowChange} step="0.01" min="0" className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="0.00" type="number" required/>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold font-label text-on-surface-variant uppercase tracking-widest ml-1 flex items-center gap-1">Moedas (R$)</label>
                        <input name="coins" value={openingData.coins} onChange={handleOpeningFlowChange} step="0.01" min="0" className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="0.00" type="number" required/>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold font-label text-on-surface-variant uppercase tracking-widest ml-1 flex items-center gap-1">Reserva de Troco / Caixa 2 (R$)</label>
                      <input name="changeReserve" value={openingData.changeReserve} onChange={handleOpeningFlowChange} step="0.01" min="0" className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="0.00" type="number" required/>
                    </div>
                    
                    <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-on-primary font-bold py-4 rounded-2xl mt-2 shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2">
                      <Check size={20} />
                      Abrir Caixa
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <h3 className="text-2xl font-headline font-bold tracking-tight mb-2 flex items-center gap-3">
                    <div className="p-3 bg-secondary-container text-on-secondary-container rounded-2xl"><DollarSign size={24} /></div>
                    Fechamento de Caixa
                  </h3>
                  <div className="mb-8 p-5 bg-surface-container-low rounded-2xl border border-outline-variant flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Caixa Aberto em:</p>
                      <p className="text-sm font-bold text-on-surface">{new Date(currentSession.openedAt).toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Abertura Total:</p>
                      <p className="text-sm font-bold text-primary">{formatCurrency(currentSession.openingBills + currentSession.openingCoins + currentSession.openingChangeReserve)}</p>
                    </div>
                  </div>
                  
                  <form onSubmit={closeCashSession} className="space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant pb-2">Valores em Dinheiro (Físico)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Cédulas no Fim</label>
                          <input name="bills" value={closingFlowData.bills} onChange={handleClosingFlowChange} step="0.01" min="0" className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="0.00" type="number" required/>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Moedas no Fim</label>
                          <input name="coins" value={closingFlowData.coins} onChange={handleClosingFlowChange} step="0.01" min="0" className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="0.00" type="number" required/>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Sangria (Retirada)</label>
                          <input name="sangria" value={closingFlowData.sangria} onChange={handleClosingFlowChange} step="0.01" min="0" className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="0.00" type="number" required/>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Reserva Troco Final</label>
                          <input name="changeReserve" value={closingFlowData.changeReserve} onChange={handleClosingFlowChange} step="0.01" min="0" className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="0.00" type="number" required/>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant pb-2">Vendas do Dia (Relatório do Sistema)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Vendas Dinheiro</label>
                          <input name="cashSales" value={closingFlowData.cashSales} onChange={handleClosingFlowChange} step="0.01" min="0" className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="0.00" type="number" required/>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Total PIX</label>
                          <input name="pix" value={closingFlowData.pix} onChange={handleClosingFlowChange} step="0.01" min="0" className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="0.00" type="number" required/>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Cartão Crédito</label>
                          <input name="credit" value={closingFlowData.credit} onChange={handleClosingFlowChange} step="0.01" min="0" className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="0.00" type="number" required/>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest ml-1">Cartão Débito</label>
                          <input name="debit" value={closingFlowData.debit} onChange={handleClosingFlowChange} step="0.01" min="0" className="w-full bg-surface-container-low border border-outline-variant focus:border-primary rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="0.00" type="number" required/>
                        </div>
                      </div>
                    </div>
                    
                    {(() => {
                      const initialCash = currentSession.openingBills + currentSession.openingCoins + currentSession.openingChangeReserve;
                      const cashSales = Number(closingFlowData.cashSales) || 0;
                      const sangria = Number(closingFlowData.sangria) || 0;
                      
                      // Despesas pagas em dinheiro do caixa hoje
                      const cashExpenses = recentExpenses
                        .filter(e => e.paymentSource === 'cash_drawer' && e.status === 'paid' && new Date(e.createdAt).toDateString() === new Date().toDateString())
                        .reduce((acc, e) => acc + e.amount, 0);

                      const expectedCash = initialCash + cashSales - sangria - cashExpenses;
                      const actualCash = (Number(closingFlowData.bills) || 0) + (Number(closingFlowData.coins) || 0) + (Number(closingFlowData.changeReserve) || 0);
                      const discrepancy = actualCash - expectedCash;
                      
                      return (
                        <div className="mt-6 space-y-4">
                          <div className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant flex justify-between items-center">
                            <div>
                              <span className="font-bold text-on-surface-variant text-sm">Faturamento Total:</span>
                              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">Dinheiro + Cartões + PIX</p>
                            </div>
                            <span className="text-2xl font-headline font-bold text-primary">
                              {formatCurrency(
                                (Number(closingFlowData.pix) || 0) + 
                                (Number(closingFlowData.credit) || 0) + 
                                (Number(closingFlowData.debit) || 0) + 
                                cashSales
                              )}
                            </span>
                          </div>

                          {(closingFlowData.bills || closingFlowData.coins || closingFlowData.changeReserve) ? (
                            <div className={`p-5 rounded-2xl border flex justify-between items-center ${discrepancy === 0 ? 'bg-green-50 border-green-200' : discrepancy > 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                              <div>
                                <span className={`font-bold text-sm ${discrepancy === 0 ? 'text-green-800' : discrepancy > 0 ? 'text-blue-800' : 'text-red-800'}`}>
                                  {discrepancy === 0 ? 'Caixa Batido (Sem Diferença)' : discrepancy > 0 ? 'Sobra de Caixa' : 'Quebra de Caixa (Falta)'}
                                </span>
                                <p className={`text-[10px] uppercase tracking-widest mt-1 ${discrepancy === 0 ? 'text-green-600' : discrepancy > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                  Esperado: {formatCurrency(expectedCash)}
                                </p>
                              </div>
                              <span className={`text-2xl font-headline font-bold ${discrepancy === 0 ? 'text-green-700' : discrepancy > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                {discrepancy > 0 ? '+' : ''}{formatCurrency(discrepancy)}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })()}

                    <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-on-primary font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex justify-center items-center gap-2">
                      <Send size={20} />
                      Finalizar e Enviar Fechamento
                    </button>
                  </form>
                </>
              )}

              {/* Histórico Recente de Fechamentos */}
              {recentClosings.length > 0 && (
                <div className="mt-8 pt-6 border-t border-outline-variant/30">
                  <h4 className="text-sm font-bold text-on-surface-variant mb-4 uppercase tracking-wider">Fechamentos Recentes</h4>
                  <div className="space-y-3">
                    {recentClosings.map(closing => (
                      <div key={closing.id} className="flex justify-between items-center p-4 bg-surface-container-low rounded-2xl border border-outline-variant/20">
                        <div>
                          <p className="font-headline font-bold text-sm text-on-surface">Data: {new Date(closing.date || closing.createdAt).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                          <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">Pix: {formatCurrency(closing.pix)} | Din: {formatCurrency(closing.cash)}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <p className="font-headline font-bold text-primary">{formatCurrency(closing.total)}</p>
                          <button onClick={() => deleteClosingHook(closing.id)} className="text-on-surface-variant hover:text-error transition-colors" title="Remover Fechamento">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : activeTab === 'checklist' ? (
          <section className="max-w-4xl mx-auto space-y-8">
            <div className="bg-surface-container-lowest p-8 rounded-[2rem] border border-outline-variant shadow-sm text-center">
              <h2 className="text-3xl font-headline font-bold text-primary mb-2">Checklist da Operação</h2>
              <p className="text-on-surface-variant font-medium">Data: {new Date().toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
              
              {todayChecklist && (
                <div className="mt-6 flex flex-col items-center">
                  <span className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-2">Sua Pontuação Hoje</span>
                  <div className={`w-32 h-32 rounded-full flex items-center justify-center border-8 ${todayChecklist.score >= 90 ? 'border-green-500 text-green-600' : todayChecklist.score >= 70 ? 'border-yellow-500 text-yellow-600' : 'border-red-500 text-red-600'} bg-surface-container-low`}>
                    <span className="text-4xl font-headline font-bold">{todayChecklist.score}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-2 font-medium">Meta Diária: 100 Pontos</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              {CHECKLIST_TEMPLATE.map(section => {
                let sectionCheckedCount = 0;
                let sectionTotalCount = 0;
                section.groups.forEach(g => {
                  sectionTotalCount += g.tasks.length;
                  g.tasks.forEach(t => { if (checklistData[t.id]) sectionCheckedCount++; });
                });
                const isSectionComplete = sectionTotalCount > 0 && sectionCheckedCount === sectionTotalCount;

                return (
                  <div key={section.id} className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant shadow-sm overflow-hidden">
                    <div className={`p-6 border-b border-outline-variant flex items-center justify-between ${isSectionComplete ? 'bg-primary-container/20' : 'bg-surface-container-low'}`}>
                      <div>
                        <h3 className="font-headline font-bold text-xl text-on-surface flex items-center gap-3">
                          {isSectionComplete ? <CheckCircle size={24} className="text-primary" /> : <Clock size={24} className="text-on-surface-variant" />}
                          {section.title}
                        </h3>
                        <p className="text-sm text-on-surface-variant mt-1">{section.description}</p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <span className="text-sm font-bold text-primary bg-primary-container px-3 py-1 rounded-full">{section.totalPoints} pts</span>
                      </div>
                    </div>

                    <div className="divide-y divide-outline-variant/30">
                      {section.groups.map(group => (
                        <div key={group.id} className="p-6">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-on-surface">{group.title}</h4>
                            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container px-2 py-1 rounded-md">{group.points} pontos</span>
                          </div>
                          <div className="space-y-3">
                            {group.tasks.map(task => (
                              <label key={task.id} className="flex gap-4 items-start p-3 bg-surface-container-lowest hover:bg-surface-container-low rounded-xl cursor-pointer transition-colors border border-transparent hover:border-outline-variant">
                                <div className="mt-0.5">
                                  <input 
                                    type="checkbox" 
                                    className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/50"
                                    checked={!!checklistData[task.id]}
                                    onChange={() => handleChecklistToggle(task.id)}
                                  />
                                </div>
                                <span className={`text-sm select-none ${checklistData[task.id] ? 'line-through text-on-surface-variant' : 'text-on-surface font-medium'}`}>
                                  {task.text}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-surface-container-lowest rounded-[2rem] border border-outline-variant shadow-sm p-6 overflow-hidden mt-6">
              <h3 className="font-headline font-bold text-xl text-on-surface flex items-center gap-3 mb-4">
                <Camera size={24} className="text-primary" />
                Evidências e Fotos
              </h3>
              <p className="text-sm text-on-surface-variant mb-6">Anexe fotos do salão, freezers e caixa para comprovar a realização do checklist.</p>
              
              <div className="space-y-4">
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {existingPhotos.map((url, i) => (
                    <div key={url} className="relative min-w-[120px] h-32 rounded-xl overflow-hidden border border-outline-variant bg-surface-container-low shrink-0">
                      <Image src={url} alt={`Evidência ${i + 1}`} fill className="object-cover" referrerPolicy="no-referrer" />
                      <button onClick={() => setExistingPhotos(prev => prev.filter(p => p !== url))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {checklistPhotos.map((file, i) => (
                    <div key={file.name + i} className="relative min-w-[120px] h-32 rounded-xl overflow-hidden border border-outline-variant bg-surface-container-low shrink-0">
                      <img src={URL.createObjectURL(file)} alt={`Nova Evidência ${i + 1}`} className="object-cover w-full h-full" />
                      <button onClick={() => setChecklistPhotos(prev => prev.filter(f => f !== file))} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-primary/50 text-primary rounded-2xl cursor-pointer bg-primary-container/20 hover:bg-primary-container/40 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-8 h-8 mb-2" />
                    <p className="text-sm font-bold">Adicionar Fotos</p>
                    <p className="text-xs text-primary/70 mt-1">Tire uma foto ou envie da galeria</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    multiple 
                    accept="image/*" 
                    onChange={(e) => {
                      if (e.target.files) {
                        setChecklistPhotos(prev => [...prev, ...Array.from(e.target.files as FileList)]);
                      }
                    }} 
                  />
                </label>
              </div>
            </div>

            <div className="sticky bottom-20 md:bottom-10 z-30 pt-4">
              <button 
                onClick={handleSaveChecklist}
                disabled={isUploadingChecklist}
                className={`w-full font-bold py-5 rounded-2xl shadow-xl active:scale-[0.98] transition-all flex justify-center items-center gap-3 text-lg ${isUploadingChecklist ? 'bg-surface-variant text-on-surface-variant cursor-not-allowed shadow-none' : 'bg-primary hover:bg-primary/90 text-on-primary shadow-primary/30'}`}
              >
                {isUploadingChecklist ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-on-surface-variant"></div>
                ) : (
                  <ClipboardCheck size={24} />
                )}
                {isUploadingChecklist ? 'Enviando...' : 'Gravar Checklist do Turno'}
              </button>
            </div>
            
            {/* Visualização de Histórico na Loja */}
            {checklistItems.length > 0 && (
              <div className="pt-12">
                 <h3 className="text-xl font-headline font-bold text-on-surface mb-6">Histórico de Fechamentos Recentes</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {checklistItems.filter(c => c.date !== todayStr).slice(0, 6).sort((a,b) => b.date.localeCompare(a.date)).map(past => (
                      <div key={past.id} className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant flex flex-col items-center justify-center text-center">
                        <span className="text-sm font-bold text-on-surface-variant mb-3">{new Date(past.date).toLocaleDateString('pt-BR', { timeZone: 'UTC'})}</span>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 ${past.score >= 90 ? 'border-green-500 text-green-600' : past.score >= 70 ? 'border-yellow-500 text-yellow-600' : 'border-red-500 text-red-600'} bg-surface-container-low`}>
                          <span className="text-xl font-headline font-bold">{past.score}</span>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>
            )}
          </section>
        ) : null}
      </main>

      <div className="fixed bottom-6 right-6 md:bottom-10 md:right-10 z-40">
        <button onClick={shareViaWhatsApp} className="bg-[#25D366] hover:bg-[#128C7E] text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-3 group">
          <Share2 size={24} />
          <span className="hidden md:block font-medium pr-2 max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap">Partilhar</span>
        </button>
      </div>

      <AnimatePresence>
        {isTransferModalOpen && transferItemData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-blue-600">
                  <ArrowRightLeft size={24} />
                  <h3 className="text-xl font-bold font-headline text-on-surface">Transferir Item</h3>
                </div>
                <button onClick={() => setIsTransferModalOpen(false)} className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleTransfer} className="space-y-4">
                <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant">
                  <p className="font-bold text-on-surface">{transferItemData.name}</p>
                  <p className="text-sm text-on-surface-variant">Estoque atual: {transferItemData.quantity}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase ml-1">Loja de Destino</label>
                  <select 
                    value={transferFormData.destStoreId} 
                    onChange={(e) => setTransferFormData({...transferFormData, destStoreId: e.target.value})}
                    className="w-full bg-surface-container-low border border-outline-variant focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    required
                  >
                    <option value="" disabled>Selecione a loja...</option>
                    {stores.filter(s => s.id !== storeId).map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase ml-1">Quantidade a Transferir</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0.01"
                    max={transferItemData.quantity}
                    value={transferFormData.quantity} 
                    onChange={(e) => setTransferFormData({...transferFormData, quantity: e.target.value})}
                    className="w-full bg-surface-container-low border border-outline-variant focus:border-blue-500 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    placeholder="Ex: 1 ou 0.5"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsTransferModalOpen(false)} className="flex-1 py-3 px-4 bg-surface-container hover:bg-surface-container-high text-on-surface font-medium rounded-xl transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                    <ArrowRightLeft size={18} />
                    Transferir
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
        {isAnyLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-background/60 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <RefreshCw size={48} className="text-primary animate-spin" />
              <p className="text-primary font-bold animate-pulse">Carregando dados...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
