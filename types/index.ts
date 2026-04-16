export type UserRole = 'admin' | 'manager' | 'employee' | 'store';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  storeId?: string;
  name?: string;
  createdAt?: string;
}

export interface Store {
  id: string;
  name: string;
  createdAt?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  minQuantity?: number;
  price?: number;
  dailyConsumption?: number;
  autoDailyConsumption?: number;
  daysTracked?: number;
  lastCountDate?: string;
  lastCountQuantity?: number;
  waste?: number;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  storeId?: string;
  description: string;
  amount: number;
  dueDate: string;
  category?: string;
  notes?: string;
  paymentSource: 'cash_drawer' | 'external';
  isRecurring: boolean;
  status: 'pending' | 'paid';
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface Closing {
  id: string;
  storeId?: string;
  date?: string;
  pix: number;
  credit: number;
  debit: number;
  cash: number;
  total: number;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface CashBalances {
  cedulas: number;
  moedas: number;
  reserva: number;
}

export interface CashClosingBalances extends CashBalances {
  vendas: number;
  pix: number;
  cartoes: number;
  sangria: number;
}

export interface CashSession {
  id: string;
  storeId: string;
  date: string;
  status: 'open' | 'closed';
  openedAt: string;
  openedBy: string;
  openingBills: number;
  openingCoins: number;
  openingChangeReserve: number;
  closedAt?: string;
  closedBy?: string;
  closingBills?: number;
  closingCoins?: number;
  closingChangeReserve?: number;
  sangria?: number;
  cashSales?: number;
  pix?: number;
  credit?: number;
  debit?: number;
  totalReported?: number;
  discrepancy?: number;
}

export interface Transfer {
  id: string;
  fromStoreId: string;
  fromStoreName: string;
  toStoreId: string;
  toStoreName: string;
  itemId: string;
  itemName: string;
  quantity: number;
  date: string;
  transferredBy: string;
}
