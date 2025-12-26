import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { ModPack } from "../types/mod";

export interface ModPackApplicationProgress {
  isRunning: boolean;
  modPack: ModPack | null;
  currentModIndex: number;
  totalMods: number;
  currentModId: string | null;
  success: number;
  failed: number;
  skipped: number;
  cancelled: boolean;
}

interface ModPackApplicationContextType {
  progress: ModPackApplicationProgress;
  startApplication: (modPack: ModPack, abortController: AbortController) => void;
  updateProgress: (update: Partial<ModPackApplicationProgress>) => void;
  cancelApplication: () => void;
  reset: () => void;
  getAbortController: () => AbortController | null;
}

const ModPackApplicationContext = createContext<ModPackApplicationContextType | undefined>(undefined);

export function useModPackApplication() {
  const context = useContext(ModPackApplicationContext);
  if (!context) {
    throw new Error("useModPackApplication must be used within a ModPackApplicationProvider");
  }
  return context;
}

export function ModPackApplicationProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ModPackApplicationProgress>({
    isRunning: false,
    modPack: null,
    currentModIndex: 0,
    totalMods: 0,
    currentModId: null,
    success: 0,
    failed: 0,
    skipped: 0,
    cancelled: false,
  });
  
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const startApplication = useCallback((modPack: ModPack, abortController: AbortController) => {
    abortControllerRef.current = abortController;
    setProgress({
      isRunning: true,
      modPack,
      currentModIndex: 0,
      totalMods: modPack.mods.length,
      currentModId: null,
      success: 0,
      failed: 0,
      skipped: 0,
      cancelled: false,
    });
  }, []);

  const updateProgress = useCallback((update: Partial<ModPackApplicationProgress>) => {
    setProgress((prev) => ({ ...prev, ...update }));
  }, []);

  const cancelApplication = useCallback(() => {
    // Abort the controller signal to stop the async operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      console.log("[ModPackApplicationContext] AbortController aborted");
    }
    setProgress((prev) => ({
      ...prev,
      cancelled: true,
      isRunning: false,
    }));
  }, []);
  
  const getAbortController = useCallback(() => {
    return abortControllerRef.current;
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current = null;
    setProgress({
      isRunning: false,
      modPack: null,
      currentModIndex: 0,
      totalMods: 0,
      currentModId: null,
      success: 0,
      failed: 0,
      skipped: 0,
      cancelled: false,
    });
  }, []);

  return (
    <ModPackApplicationContext.Provider
      value={{
        progress,
        startApplication,
        updateProgress,
        cancelApplication,
        reset,
        getAbortController,
      }}
    >
      {children}
    </ModPackApplicationContext.Provider>
  );
}

