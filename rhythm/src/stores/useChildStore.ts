import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Child } from '../types';

interface ChildState {
  children: Child[];
  addChild: (child: Omit<Child, 'id'>) => string;
  updateChild: (id: string, updates: Partial<Omit<Child, 'id'>>) => void;
  removeChild: (id: string) => void;
  getChild: (id: string) => Child | undefined;
  getNappingChildren: () => Child[];
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

      getChild: (id) => {
        return get().children.find((child) => child.id === id);
      },

      getNappingChildren: () => {
        return get().children.filter((child) => child.isNappingAge);
      },
    }),
    {
      name: 'rhythm_children',
    }
  )
);
