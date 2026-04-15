import { useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import * as inventoryService from '../services/inventoryService';

export const useInventory = (storeId: string | null) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) {
      return;
    }

    const unsubscribe = inventoryService.subscribeToInventory(
      storeId,
      (data) => {
        setItems(data);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching inventory:", err);
        setError("Erro ao carregar inventário.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [storeId]);

  const addItem = async (itemData: Omit<InventoryItem, 'id' | 'updatedAt'>) => {
    if (!storeId) throw new Error("Store ID is required");
    return inventoryService.addItem(storeId, itemData);
  };

  const updateItem = async (itemId: string, data: Partial<InventoryItem>) => {
    if (!storeId) throw new Error("Store ID is required");
    return inventoryService.updateItem(storeId, itemId, data);
  };

  const deleteItem = async (itemId: string) => {
    if (!storeId) throw new Error("Store ID is required");
    return inventoryService.deleteItem(storeId, itemId);
  };

  const resetInventory = async () => {
    if (!storeId) throw new Error("Store ID is required");
    return inventoryService.resetInventory(storeId, items);
  };

  const calculateTrackingUpdates = (item: InventoryItem, field: string, newValue: number) => {
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

  const confirmTrackingUpdate = async (item: InventoryItem, field: string, newValue: number) => {
    const updates = calculateTrackingUpdates(item, field, newValue);
    return updateItem(item.id, updates);
  };

  return {
    items,
    isLoading,
    error,
    addItem,
    updateItem,
    deleteItem,
    resetInventory,
    confirmTrackingUpdate
  };
};
