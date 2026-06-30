import { create } from 'zustand';
import type { RawMaterialEntry } from '../services/rawMaterialService';

interface RawMaterialState {
  selected: RawMaterialEntry | null;
  setSelected: (entry: RawMaterialEntry | null) => void;
}

export const useRawMaterialStore = create<RawMaterialState>((set) => ({
  selected: null,
  setSelected: (entry) => set({ selected: entry }),
}));
