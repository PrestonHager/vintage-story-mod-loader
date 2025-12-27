import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Mod } from "../types/mod";
import { getSettings } from "../services/storage";

interface ModListContextType {
  mods: Mod[];
  modsPath: string;
  loading: boolean;
  loadMods: (forceRefresh?: boolean) => Promise<void>;
  refreshMods: () => Promise<void>;
}

const ModListContext = createContext<ModListContextType | undefined>(undefined);

export function ModListProvider({ children }: { children: ReactNode }) {
  const [mods, setMods] = useState<Mod[]>([]);
  const [modsPath, setModsPath] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const isInitializedRef = useRef(false);

  const loadMods = useCallback(async (forceRefresh: boolean = false) => {
    // If we already have mods and not forcing refresh, don't reload
    if (isInitializedRef.current && !forceRefresh) {
      return;
    }

    try {
      setLoading(true);
      const settings = await getSettings();
      const path = settings.mods_path || await invoke<string>("get_vintage_story_path");
      setModsPath(path);
      
      const modList = await invoke<Mod[]>("get_mod_list", { modsPath: path, forceRefresh });
      setMods(modList);
      isInitializedRef.current = true;
    } catch (error) {
      console.error("Failed to load mods:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshMods = useCallback(async () => {
    await loadMods(true);
  }, [loadMods]);

  // Load mods on first mount (app startup)
  useEffect(() => {
    loadMods(true); // Force refresh on first load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ModListContext.Provider value={{ mods, modsPath, loading, loadMods, refreshMods }}>
      {children}
    </ModListContext.Provider>
  );
}

export function useModList() {
  const context = useContext(ModListContext);
  if (context === undefined) {
    throw new Error("useModList must be used within a ModListProvider");
  }
  return context;
}

