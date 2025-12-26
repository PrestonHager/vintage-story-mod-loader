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
    } else if (filePath !== null && filePath !== undefined && Array.isArray(filePath)) {
      console.log("[modpack.ts] File path is an array, using first element:", filePath[0]);
      const filePathArray = filePath as string[];
      if (filePathArray.length > 0 && typeof filePathArray[0] === "string") {
        path = filePathArray[0];
      }
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

export interface ApplyModPackResult {
  success: number;
  failed: number;
  skipped: number;
}

export interface ApplyModPackOptions {
  showToast?: (message: string, type?: "success" | "error" | "warning" | "info", duration?: number) => void;
  onProgress?: (currentIndex: number, total: number, currentModId: string | null) => void;
  onSuccess?: (modId: string) => void;
  onFailed?: (modId: string, error: string) => void;
  onSkipped?: (modId: string) => void;
  abortSignal?: AbortSignal;
}

export async function applyModPack(
  pack: ModPack,
  modsPath: string,
  options: ApplyModPackOptions = {}
): Promise<ApplyModPackResult> {
  const { showToast, onProgress, onSuccess, onFailed, onSkipped, abortSignal } = options;
  // Download missing mods and enable all mods in pack
  const { downloadMod } = await import("./api");
  const { invoke } = await import("@tauri-apps/api/core");
  
  // Helper function to construct download URL from mod info
  function constructDownloadUrl(modId: string, version: string, url?: string): string | null {
    // If URL is already a direct download URL, use it
    if (url && url.includes('/download/') && (url.endsWith('.zip') || url.endsWith('.tar') || url.endsWith('.tar.gz'))) {
      return url;
    }
    
    // Try to construct URL from mod ID and version
    // Format: https://mods.vintagestory.at/download/<number>/<name>_<version>.zip
    // Since we don't know the number, we'll try constructing without it
    // The mod database sometimes uses: https://mods.vintagestory.at/download/<name>_<version>.zip
    
    // Clean up mod ID and version for URL
    // Keep only alphanumeric, dots, dashes, underscores
    const cleanModId = modId.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
    const cleanVersion = version === "unknown" ? "" : version.replace(/[^a-zA-Z0-9._-]/g, '');
    
    // Construct URL: if version exists, use format <name>_<version>.zip, otherwise just <name>.zip
    if (cleanVersion) {
      return `https://mods.vintagestory.at/download/${cleanModId}_${cleanVersion}.zip`;
    } else {
      return `https://mods.vintagestory.at/download/${cleanModId}.zip`;
    }
  }

  const result: ApplyModPackResult = {
    success: 0,
    failed: 0,
    skipped: 0,
  };

  for (let i = 0; i < pack.mods.length; i++) {
    const modPackMod = pack.mods[i];
    
    // Check for cancellation
    if (abortSignal?.aborted) {
      console.log("[applyModPack] Application cancelled by user");
      // Count remaining mods as skipped
      const remainingMods = pack.mods.length - i;
      result.skipped += remainingMods;
      onProgress?.(pack.mods.length, pack.mods.length, null);
      // Update skipped count in progress
      for (let j = 0; j < remainingMods; j++) {
        onSkipped?.(pack.mods[i + j].id);
      }
      break;
    }

    try {
      // Check for cancellation before starting this mod
      if (abortSignal?.aborted) {
        console.log("[applyModPack] Application cancelled by user");
        break;
      }

      // Update progress
      onProgress?.(i, pack.mods.length, modPackMod.id);

      // Check for cancellation after progress update
      if (abortSignal?.aborted) {
        console.log("[applyModPack] Application cancelled by user");
        break;
      }

      // Check if mod is already installed
      const modList = await invoke<any[]>("get_mod_list", { modsPath });
      
      // Check for cancellation after mod list check
      if (abortSignal?.aborted) {
        console.log("[applyModPack] Application cancelled by user");
        break;
      }
      
      const isInstalled = modList.some(m => m.id === modPackMod.id);

      if (!isInstalled) {
        // Construct download URL from mod pack data
        let downloadUrl: string | null = null;
        
        // Try to construct URL from mod pack data
        downloadUrl = constructDownloadUrl(modPackMod.id, modPackMod.version, modPackMod.url);
        
        if (!downloadUrl) {
          console.warn(`[applyModPack] Could not construct download URL for ${modPackMod.id}`);
        } else {
          console.log(`[applyModPack] Constructed download URL for ${modPackMod.id}: ${downloadUrl}`);
        }

        if (downloadUrl && downloadUrl.trim() !== '') {
          // Check for cancellation before download
          if (abortSignal?.aborted) {
            console.log("[applyModPack] Application cancelled by user");
            break;
          }
          
          console.log(`[applyModPack] Downloading ${modPackMod.id} from ${downloadUrl}`);
          try {
            await downloadMod(modPackMod.id, downloadUrl, modsPath);
            
            // Check for cancellation after download
            if (abortSignal?.aborted) {
              console.log("[applyModPack] Application cancelled by user");
              break;
            }
            
            showToast?.(`Downloaded ${modPackMod.id}`, "success", 3000);
          } catch (error) {
            // Check if error is due to cancellation
            if (abortSignal?.aborted) {
              console.log("[applyModPack] Application cancelled by user during download");
              break;
            }
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`[applyModPack] Failed to download ${modPackMod.id}:`, error);
            showToast?.(`Failed to download ${modPackMod.id}: ${errorMsg}`, "error", 6000);
            onFailed?.(modPackMod.id, errorMsg);
            result.failed++;
            continue; // Skip enabling if download failed
          }
        } else {
          // No download URL available and mod is not installed - this is a failure
          console.warn(`[applyModPack] No download URL available for ${modPackMod.id}, cannot download`);
          const errorMsg = `No download URL available for ${modPackMod.id}`;
          showToast?.(errorMsg, "error", 6000);
          onFailed?.(modPackMod.id, errorMsg);
          result.failed++;
          continue; // Skip enabling since we couldn't download
        }
      } else {
        console.log(`[applyModPack] Mod ${modPackMod.id} is already installed`);
        onSkipped?.(modPackMod.id);
        result.skipped++;
      }

      // Check for cancellation before enabling
      if (abortSignal?.aborted) {
        console.log("[applyModPack] Application cancelled by user");
        break;
      }

      // Enable mod (only if it was downloaded or already installed)
      try {
        await invoke("enable_mods", { modsPath, modIds: [modPackMod.id] });
        
        // Check for cancellation after enable
        if (abortSignal?.aborted) {
          console.log("[applyModPack] Application cancelled by user");
          break;
        }
        
        onSuccess?.(modPackMod.id);
        result.success++;
      } catch (error) {
        // Check if error is due to cancellation
        if (abortSignal?.aborted) {
          console.log("[applyModPack] Application cancelled by user during enable");
          break;
        }
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[applyModPack] Failed to enable ${modPackMod.id}:`, error);
        showToast?.(`Failed to enable ${modPackMod.id}: ${errorMsg}`, "error", 6000);
        onFailed?.(modPackMod.id, errorMsg);
        result.failed++;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Failed to process mod ${modPackMod.id}:`, error);
      showToast?.(`Failed to process mod ${modPackMod.id}: ${errorMsg}`, "error", 6000);
      onFailed?.(modPackMod.id, errorMsg);
      result.failed++;
    }
  }

  // Final progress update
  onProgress?.(pack.mods.length, pack.mods.length, null);

  return result;
}

