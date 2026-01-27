import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Child, CareStatus, CareContext } from '../types';

interface ChildState {
  children: Child[];
  addChild: (child: Omit<Child, 'id'>) => string;
  updateChild: (id: string, updates: Partial<Omit<Child, 'id'>>) => void;
  removeChild: (id: string) => void;
  clearChildren: () => void;
  getChild: (id: string) => Child | undefined;
  getNappingChildren: () => Child[];
  updateCareStatus: (childId: string, status: CareStatus) => void;
  getCareStatus: (childId: string) => CareStatus;
  getCurrentCareContext: () => CareContext;
}

export const useChildStore = create<ChildState>()(
  persist(
    (set, get) => ({
      children: [],

      addChild: (childData) => {
        const id = uuidv4();
        const newChild: Child = { id, ...childData };
        set((state) => ({
          children: [...state.children, newChild],
        }));
        return id;
      },

      updateChild: (id, updates) => {
        set((state) => ({
          children: state.children.map((child) =>
            child.id === id ? { ...child, ...updates } : child
          ),
        }));
      },

      removeChild: (id) => {
        set((state) => ({
          children: state.children.filter((child) => child.id !== id),
        }));
      },

      clearChildren: () => {
        set({ children: [] });
      },

      getChild: (id) => {
        return get().children.find((child) => child.id === id);
      },

      getNappingChildren: () => {
        return get().children.filter((child) => child.isNappingAge);
      },

      updateCareStatus: (childId, status) => {
        set((state) => ({
          children: state.children.map((child) =>
            child.id === childId ? { ...child, careStatus: status } : child
          ),
        }));
      },

      getCareStatus: (childId) => {
        const child = get().children.find((c) => c.id === childId);
        return child?.careStatus ?? 'home';
      },

      getCurrentCareContext: () => {
        const children = get().children;
        if (children.length === 0) return 'any';

        const allHome = children.every((c) => (c.careStatus ?? 'home') === 'home');
        const allAway = children.every((c) => {
          const status = c.careStatus ?? 'home';
          return status === 'away' || status === 'asleep';
        });
        const anyAway = children.some((c) => {
          const status = c.careStatus ?? 'home';
          return status === 'away' || status === 'asleep';
        });

        if (allAway) return 'all-away';
        if (anyAway) return 'any-away';
        if (allHome) return 'all-home';
        return 'any';
      },
    }),
    {
      name: 'rhythm_children',
    }
  )
);
