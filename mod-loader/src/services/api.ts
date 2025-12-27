import { invoke } from "@tauri-apps/api/core";
import type { ModSearchResult, ModDatabaseMod } from "../types/mod";

// VS Mod DB API: http://mods.vintagestory.at/api
// API docs: https://raw.githubusercontent.com/anegostudios/vsmoddb/refs/heads/master/README.md

export interface ModSearchItem {
  id?: number;
  modid?: string;
  name?: string;
  description?: string;
  author?: string;
  thumbnail?: string;
  category?: string;
  tags?: string[];
  releases?: Array<{ mainfile: string; version?: string }>;
}

export interface ModSearchApiResult {
  status_code?: number;
  mods: ModSearchItem[];
}

export async function searchMods(query?: string, page?: number): Promise<ModSearchResult> {
  const result = await invoke<ModSearchApiResult>("search_mods", { query, page });
  
  // Convert API response to frontend format
  const mods: ModDatabaseMod[] = result.mods.map((item) => {
    // Get download URL from first release if available
    const downloadUrl = item.releases?.[0]?.mainfile;
    // Get version from first release if available
    const version = item.releases?.[0]?.version || "unknown";
    
    return {
      id: item.modid || item.id?.toString() || "unknown",
      name: item.name || "Unknown Mod",
      version,
      description: item.description,
      author: item.author,
      download_url: downloadUrl,
      thumbnail_url: item.thumbnail,
      category: item.category,
      tags: item.tags || [],
    };
  });
  
  return {
    mods,
    total: mods.length,
    page: page || 1,
    per_page: 20,
  };
}

export async function getModDownloadUrl(modId: string, modUrl?: string): Promise<string> {
  return await invoke("get_mod_download_url", { modId, modUrl });
}

export async function downloadMod(modId: string, downloadUrl: string, modsPath: string): Promise<string> {
  return await invoke("download_mod", { modId, downloadUrl, modsPath });
}

export async function checkModStatus(modId: string, modsPath: string) {
  return await invoke("check_mod_status", { modId, modsPath });
}

