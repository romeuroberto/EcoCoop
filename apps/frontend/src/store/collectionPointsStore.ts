import { create } from 'zustand';
import type { CollectionPoint } from '../services/collectionPoints.service';

interface CollectionPointsState {
  selected: CollectionPoint | null;
  setSelected: (point: CollectionPoint | null) => void;
}

export const useCollectionPointsStore = create<CollectionPointsState>((set) => ({
  selected: null,
  setSelected: (point) => set({ selected: point }),
}));
