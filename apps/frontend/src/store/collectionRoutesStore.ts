import { create } from 'zustand';
import type { CollectionRoute } from '../services/collectionRoutes.service';

interface CollectionRoutesState {
  selected: CollectionRoute | null;
  setSelected: (route: CollectionRoute | null) => void;
}

export const useCollectionRoutesStore = create<CollectionRoutesState>((set) => ({
  selected: null,
  setSelected: (route) => set({ selected: route }),
}));
