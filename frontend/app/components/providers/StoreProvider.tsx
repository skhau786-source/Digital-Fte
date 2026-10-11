"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface ActiveStore {
  id: string;
  name: string;
  domain: string;
  platform: string;
}

interface StoreContextType {
  activeStore: ActiveStore | null;
  setActiveStore: (store: ActiveStore | null) => void;
  stores: ActiveStore[];
  setStores: React.Dispatch<React.SetStateAction<ActiveStore[]>>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);
const STORE_STORAGE_KEY = "digital_fte_active_store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [activeStore, setActiveStoreState] = useState<ActiveStore | null>(null);
  const [stores, setStores] = useState<ActiveStore[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_STORAGE_KEY);
      if (saved) {
        setActiveStoreState(JSON.parse(saved));
      }
    } catch {
      // Ignore invalid JSON
    }
  }, []);

  const setActiveStore = useCallback((store: ActiveStore | null) => {
    setActiveStoreState(store);
    try {
      if (store) {
        localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(store));
      } else {
        localStorage.removeItem(STORE_STORAGE_KEY);
      }
    } catch {
      // Ignore write errors
    }
  }, []);

  return (
    <StoreContext.Provider value={{ activeStore, setActiveStore, stores, setStores }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
