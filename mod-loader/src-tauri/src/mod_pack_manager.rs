use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use tauri::command;

use crate::mod_pack::ModPack;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModPackInfo {
    pub name: String,
    pub version: String,
    pub description: String,
    pub mod_count: usize,
    pub path: String,
    pub enabled: bool,
    pub mod_ids: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ModPackState {
    enabled_packs: HashSet<String>, // Set of mod pack file paths
}

fn get_mod_packs_dir() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or("Failed to get config directory")?
        .join("vs-mod-loader")
        .join("mod-packs");
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create mod packs directory: {}", e))?;
    Ok(config_dir)
}

fn get_mod_pack_state_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or("Failed to get config directory")?
        .join("vs-mod-loader");
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create config directory: {}", e))?;
    Ok(config_dir.join("mod-pack-state.json"))
}

fn load_mod_pack_state() -> ModPackState {
    let state_path = match get_mod_pack_state_path() {
        Ok(p) => p,
        Err(_) => return ModPackState {
            enabled_packs: HashSet::new(),
        },
    };

    if !state_path.exists() {
        return ModPackState {
            enabled_packs: HashSet::new(),
        };
    }

    match std::fs::read_to_string(&state_path) {
        Ok(content) => match serde_json::from_str::<ModPackState>(&content) {
            Ok(state) => state,
            Err(e) => {
                eprintln!("Failed to parse mod pack state: {}", e);
                ModPackState {
                    enabled_packs: HashSet::new(),
                }
            }
        },
        Err(e) => {
            eprintln!("Failed to read mod pack state: {}", e);
            ModPackState {
                enabled_packs: HashSet::new(),
            }
        }
    }
}

fn save_mod_pack_state(state: &ModPackState) -> Result<(), String> {
    let state_path = get_mod_pack_state_path()?;
    let content = serde_json::to_string_pretty(state)
        .map_err(|e| format!("Failed to serialize mod pack state: {}", e))?;
    std::fs::write(&state_path, content)
        .map_err(|e| format!("Failed to write mod pack state: {}", e))?;
    Ok(())
}

#[command]
pub async fn list_mod_packs() -> Result<Vec<ModPackInfo>, String> {
    let mod_packs_dir = get_mod_packs_dir()?;
    let state = load_mod_pack_state();
    let mut packs = Vec::new();

    if !mod_packs_dir.exists() {
        return Ok(packs);
    }

    let entries = std::fs::read_dir(&mod_packs_dir)
        .map_err(|e| format!("Failed to read mod packs directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("json") {
            match ModPack::from_file(&path) {
                Ok(pack) => {
                    let path_str = path.to_string_lossy().to_string();
                    let enabled = state.enabled_packs.contains(&path_str);

                    packs.push(ModPackInfo {
                        name: pack.name.clone(),
                        version: pack.version.clone(),
                        description: pack.description.clone(),
                        mod_count: pack.mods.len(),
                        path: path_str,
                        enabled,
                        mod_ids: pack.mods.iter().map(|m| m.id.clone()).collect(),
                    });
                }
                Err(e) => {
                    eprintln!("Failed to load mod pack from {}: {}", path.display(), e);
                }
            }
        }
    }

    Ok(packs)
}

#[command]
pub async fn enable_mod_pack(pack_path: String, mods_path: String) -> Result<(), String> {
    use crate::mod_manager;

    // Load the mod pack
    let pack = ModPack::from_file(Path::new(&pack_path))
        .map_err(|e| format!("Failed to load mod pack: {}", e))?;

    // Get all currently enabled mod packs
    let state = load_mod_pack_state();
    let mut all_enabled_mod_ids = HashSet::new();

    // Collect mod IDs from all enabled packs
    for enabled_pack_path in &state.enabled_packs {
        if let Ok(enabled_pack) = ModPack::from_file(Path::new(enabled_pack_path)) {
            for mod_item in enabled_pack.mods {
                all_enabled_mod_ids.insert(mod_item.id);
            }
        }
    }

    // Add mods from the pack we're enabling
    for mod_item in &pack.mods {
        all_enabled_mod_ids.insert(mod_item.id.clone());
    }

    // Enable all mods in the union
    let mod_ids_to_enable: Vec<String> = all_enabled_mod_ids.into_iter().collect();
    mod_manager::enable_mods(mods_path, mod_ids_to_enable)
        .await
        .map_err(|e| format!("Failed to enable mods: {}", e))?;

    // Update state
    let mut new_state = state;
    new_state.enabled_packs.insert(pack_path);
    save_mod_pack_state(&new_state)
        .map_err(|e| format!("Failed to save mod pack state: {}", e))?;

    Ok(())
}

#[command]
pub async fn disable_mod_pack(pack_path: String, mods_path: String) -> Result<(), String> {
    use crate::mod_manager;

    // Load the mod pack we're disabling
    let pack = ModPack::from_file(Path::new(&pack_path))
        .map_err(|e| format!("Failed to load mod pack: {}", e))?;

    // Get all currently enabled mod packs
    let mut state = load_mod_pack_state();
    state.enabled_packs.remove(&pack_path);

    // Collect mod IDs from remaining enabled packs
    let mut mod_ids_to_keep = HashSet::new();
    for enabled_pack_path in &state.enabled_packs {
        if let Ok(enabled_pack) = ModPack::from_file(Path::new(enabled_pack_path)) {
            for mod_item in enabled_pack.mods {
                mod_ids_to_keep.insert(mod_item.id);
            }
        }
    }

    // Find mods that should be disabled (in the disabled pack but not in any other enabled pack)
    let mut mod_ids_to_disable = Vec::new();
    for mod_item in &pack.mods {
        if !mod_ids_to_keep.contains(&mod_item.id) {
            mod_ids_to_disable.push(mod_item.id.clone());
        }
    }

    // Disable mods that are no longer needed
    if !mod_ids_to_disable.is_empty() {
        mod_manager::disable_mods(mods_path, mod_ids_to_disable)
            .await
            .map_err(|e| format!("Failed to disable mods: {}", e))?;
    }

    // Update state
    save_mod_pack_state(&state)
        .map_err(|e| format!("Failed to save mod pack state: {}", e))?;

    Ok(())
}

#[command]
pub async fn save_mod_pack_to_packs_dir(pack: ModPack) -> Result<String, String> {
    let mod_packs_dir = get_mod_packs_dir()?;
    
    // Create a safe filename from the pack name
    let safe_name = pack
        .name
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect::<String>();
    
    let file_path = mod_packs_dir.join(format!("{}.json", safe_name));
    
    pack.to_file(&file_path)
        .map_err(|e| format!("Failed to save mod pack: {}", e))?;
    
    Ok(file_path.to_string_lossy().to_string())
}

