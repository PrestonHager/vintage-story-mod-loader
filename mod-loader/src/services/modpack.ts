import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
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
  try {
    console.log("[modpack.ts] Opening file dialog...");
    console.log("[modpack.ts] Dialog options:", {
      filters: [{ name: "Mod Pack", extensions: ["json"] }],
      multiple: false,
      title: "Select Mod Pack JSON File"
    });
    
    const filePath = await open({
      filters: [{
        name: "Mod Pack",
        extensions: ["json"]
      }],
      multiple: false,
      title: "Select Mod Pack JSON File"
    });

    console.log("[modpack.ts] File dialog returned:", filePath);
    console.log("[modpack.ts] Type of filePath:", typeof filePath);
    console.log("[modpack.ts] Is array?", Array.isArray(filePath));

    // Handle different return types from Tauri dialog
    let path: string | null = null;
    if (typeof filePath === "string") {
      console.log("[modpack.ts] File path is a string:", filePath);
      path = filePath;
    } else if (Array.isArray(filePath) && filePath.length > 0) {
      console.log("[modpack.ts] File path is an array, using first element:", filePath[0]);
      path = filePath[0];
    } else if (filePath === null || filePath === undefined) {
      // User cancelled
      console.log("[modpack.ts] User cancelled file selection");
      return null;
    } else {
      console.warn("[modpack.ts] Unexpected filePath type:", typeof filePath, filePath);
    }

    if (!path) {
      console.warn("[modpack.ts] No file path returned from dialog");
      return null;
    }

    console.log("[modpack.ts] Calling Tauri command import_mod_pack with path:", path);
    console.log("[modpack.ts] Invoking backend...");
    
    const pack = await invoke<ModPack>("import_mod_pack", { filePath: path });
    
    console.log("[modpack.ts] Backend returned mod pack:", {
      name: pack.name,
      version: pack.version,
      modsCount: pack.mods.length,
      hasDescription: !!pack.description
    });
    console.log("[modpack.ts] Successfully imported mod pack:", pack.name);
    return pack;
  } catch (error) {
    console.error("[modpack.ts] Failed to import mod pack:", error);
    console.error("[modpack.ts] Error type:", error?.constructor?.name);
    console.error("[modpack.ts] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to import mod pack: ${errorMessage}`);
  }
}

export async function applyModPack(pack: ModPack, modsPath: string): Promise<void> {
  // Download missing mods and enable all mods in pack
  const { getModDetails, downloadMod } = await import("./api");
  const { invoke } = await import("@tauri-apps/api/core");

  for (const modPackMod of pack.mods) {
    try {
      // Check if mod is already installed
      const modList = await invoke<any[]>("get_mod_list", { modsPath });
      const isInstalled = modList.some(m => m.id === modPackMod.id);

      if (!isInstalled) {
        // Try to use URL from mod pack first, otherwise search the database
        let downloadUrl: string | undefined = modPackMod.url;
        
        // If URL is a page URL (not a direct download), fetch the download URL from API
        if (downloadUrl && (downloadUrl.includes('/show/mod/') || downloadUrl.includes('mods.vintagestory.at') && !downloadUrl.includes('/download/'))) {
          console.log(`[applyModPack] URL appears to be a page URL, fetching download URL from API for ${modPackMod.id}...`);
          try {
            const modDetails = await getModDetails(modPackMod.id);
            downloadUrl = modDetails.download_url || undefined;
          } catch (error) {
            console.warn(`[applyModPack] Failed to get mod details for ${modPackMod.id}:`, error);
            downloadUrl = undefined;
          }
        }
        
        if (!downloadUrl) {
          console.log(`[applyModPack] No URL in mod pack for ${modPackMod.id}, searching database...`);
          try {
            const modDetails = await getModDetails(modPackMod.id);
            downloadUrl = modDetails.download_url || undefined;
          } catch (error) {
            console.warn(`[applyModPack] Failed to get mod details for ${modPackMod.id}:`, error);
          }
        }

        if (downloadUrl) {
          console.log(`[applyModPack] Downloading ${modPackMod.id} from ${downloadUrl}`);
          await downloadMod(modPackMod.id, downloadUrl, modsPath);
        } else {
          console.warn(`[applyModPack] No download URL available for ${modPackMod.id}, skipping download`);
        }
      } else {
        console.log(`[applyModPack] Mod ${modPackMod.id} is already installed`);
      }

      // Enable mod
      await invoke("enable_mods", { modsPath, modIds: [modPackMod.id] });
    } catch (error) {
      console.error(`Failed to process mod ${modPackMod.id}:`, error);
      // Continue with other mods instead of throwing
      console.warn(`Continuing with other mods...`);
    }
  }
}

