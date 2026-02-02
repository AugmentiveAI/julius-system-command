import { useState, useEffect, useCallback } from 'react';
import { InventoryState, InventoryItem, INITIAL_INVENTORY } from '@/types/inventory';

const INVENTORY_STORAGE_KEY = 'the-system-inventory';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function loadInventory(): InventoryState {
  try {
    const stored = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load inventory data:', e);
  }
  return INITIAL_INVENTORY;
}

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryState>(loadInventory);

  useEffect(() => {
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(inventory));
  }, [inventory]);

  const setAutomationsDeployed = useCallback((count: number) => {
    const validCount = Math.max(0, Math.min(99999, Math.floor(count)));
    setInventory(prev => ({ ...prev, automationsDeployed: validCount }));
  }, []);

  const setCashReserves = useCallback((amount: number) => {
    const validAmount = Math.max(0, Math.min(999999999, Math.floor(amount)));
    setInventory(prev => ({ ...prev, cashReserves: validAmount }));
  }, []);

  const addClient = useCallback((name: string) => {
    const trimmedName = name.trim().slice(0, 100);
    if (!trimmedName) return;
    const newItem: InventoryItem = {
      id: generateId(),
      name: trimmedName,
      createdAt: new Date().toISOString(),
    };
    setInventory(prev => ({
      ...prev,
      activeClients: [...prev.activeClients, newItem],
    }));
  }, []);

  const removeClient = useCallback((id: string) => {
    setInventory(prev => ({
      ...prev,
      activeClients: prev.activeClients.filter(c => c.id !== id),
    }));
  }, []);

  const addSkill = useCallback((name: string) => {
    const trimmedName = name.trim().slice(0, 100);
    if (!trimmedName) return;
    const newItem: InventoryItem = {
      id: generateId(),
      name: trimmedName,
      createdAt: new Date().toISOString(),
    };
    setInventory(prev => ({
      ...prev,
      skillsCreated: [...prev.skillsCreated, newItem],
    }));
  }, []);

  const removeSkill = useCallback((id: string) => {
    setInventory(prev => ({
      ...prev,
      skillsCreated: prev.skillsCreated.filter(s => s.id !== id),
    }));
  }, []);

  const addTemplate = useCallback((name: string) => {
    const trimmedName = name.trim().slice(0, 100);
    if (!trimmedName) return;
    const newItem: InventoryItem = {
      id: generateId(),
      name: trimmedName,
      createdAt: new Date().toISOString(),
    };
    setInventory(prev => ({
      ...prev,
      templatesFrameworks: [...prev.templatesFrameworks, newItem],
    }));
  }, []);

  const removeTemplate = useCallback((id: string) => {
    setInventory(prev => ({
      ...prev,
      templatesFrameworks: prev.templatesFrameworks.filter(t => t.id !== id),
    }));
  }, []);

  return {
    inventory,
    setAutomationsDeployed,
    setCashReserves,
    addClient,
    removeClient,
    addSkill,
    removeSkill,
    addTemplate,
    removeTemplate,
  };
}
