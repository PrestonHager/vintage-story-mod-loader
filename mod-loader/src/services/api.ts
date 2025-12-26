import { invoke } from "@tauri-apps/api/core";
import type { ModSearchResult, ModDatabaseMod } from "../types/mod";

export async function searchMods(query?: string, page?: number): Promise<ModSearchResult> {
  return await invoke("search_mods", { query, page });
}

export async function getModDetails(modId: string): Promise<ModDatabaseMod> {
  return await invoke("get_mod_details", { modId });
}

export async function downloadMod(modId: string, downloadUrl: string, modsPath: string): Promise<string> {
  return await invoke("download_mod", { modId, downloadUrl, modsPath });
}

