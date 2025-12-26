import { invoke } from "@tauri-apps/api/core";

// Mod database API functions removed - API is not reliable
// Download URLs are now scraped from mod pages
// Format: https://mods.vintagestory.at/download/<number>/<name>_<version>.zip

export async function getModDownloadUrl(modId: string, modUrl?: string): Promise<string> {
  return await invoke("get_mod_download_url", { modId, modUrl });
}

export async function downloadMod(modId: string, downloadUrl: string, modsPath: string): Promise<string> {
  return await invoke("download_mod", { modId, downloadUrl, modsPath });
}

