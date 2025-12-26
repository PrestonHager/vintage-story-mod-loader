import { invoke } from "@tauri-apps/api/tauri";
import { open, save } from "@tauri-apps/api/dialog";
import type { ModPack } from "../types/mod";

export async function exportModPack(pack: ModPack): Promise<void> {
  const filePath = await save({
    filters: [{
      name: "Mod Pack",
      extensions: ["json"]
    }],
    defaultPath: `${pack.name.replace(/[^a-z0-9]/gi, "_")}.json`
  });

  if (filePath) {
    await invoke("export_mod_pack", { pack, filePath });
  }
}

export async function importModPack(): Promise<ModPack | null> {
  const filePath = await open({
    filters: [{
      name: "Mod Pack",
      extensions: ["json"]
    }],
    multiple: false
  });

  if (filePath && typeof filePath === "string") {
    return await invoke<ModPack>("import_mod_pack", { filePath });
  }

  return null;
}

export async function applyModPack(pack: ModPack, modsPath: string): Promise<void> {
  // Download missing mods and enable all mods in pack
  const { getModDetails, downloadMod } = await import("./api");
  const { invoke } = await import("@tauri-apps/api/tauri");

  for (const modPackMod of pack.mods) {
    try {
      // Check if mod is already installed
      const modList = await invoke<any[]>("get_mod_list", { modsPath });
      const isInstalled = modList.some(m => m.id === modPackMod.id);

      if (!isInstalled) {
        // Download mod
        const modDetails = await getModDetails(modPackMod.id);
        if (modDetails.download_url) {
          await downloadMod(modPackMod.id, modDetails.download_url, modsPath);
        }
      }

      // Enable mod
      await invoke("enable_mods", { modsPath, modIds: [modPackMod.id] });
    } catch (error) {
      console.error(`Failed to process mod ${modPackMod.id}:`, error);
      throw error;
    }
  }
}

