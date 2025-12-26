import { invoke } from "@tauri-apps/api/core";

// Mod database API functions removed - API is not reliable
// Download URLs are now constructed directly from mod pack data
// Format: https://mods.vintagestory.at/download/<modid>_<version>.zip

export async function downloadMod(modId: string, downloadUrl: string, modsPath: string): Promise<string> {
  return await invoke("download_mod", { modId, downloadUrl, modsPath });
}

