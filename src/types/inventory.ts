export interface InventoryItem {
  id: string;
  name: string;
  createdAt: string;
}

export interface InventoryState {
  automationsDeployed: number;
  activeClients: InventoryItem[];
  skillsCreated: InventoryItem[];
  templatesFrameworks: InventoryItem[];
  cashReserves: number;
}

export const INITIAL_INVENTORY: InventoryState = {
  automationsDeployed: 50,
  activeClients: [
    { id: 'client-1', name: 'Plainfield Public Library', createdAt: new Date().toISOString() },
  ],
  skillsCreated: [
    { id: 'skill-1', name: 'AI Audit Pre-Call Briefing', createdAt: new Date().toISOString() },
  ],
  templatesFrameworks: [],
  cashReserves: 0,
};
