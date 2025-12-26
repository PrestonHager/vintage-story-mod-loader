use dirs;
use hex;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};
use tauri::command;
use zip::ZipArchive;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModInfo {
    pub modid: String,
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub authors: Vec<String>,
    pub website: Option<String>,
    pub side: Option<String>,
    pub requiredonclient: Option<bool>,
    pub requiredonserver: Option<bool>,
    pub dependencies: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Mod {
    pub id: String,
    pub name: String,
    pub version: String,
    pub path: String,
    pub enabled: bool,
    pub info: Option<ModInfo>,
    #[serde(default)]
    pub is_zip: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<crate::mod_status::ModStatus>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModIndexEntry {
    pub hash: String,
    pub modid: String,
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub authors: Vec<String>,
    pub website: Option<String>,
    pub side: Option<String>,
    pub download_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub category: Option<String>,
    pub tags: Vec<String>,
    pub file_name: String,
    pub file_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ModIndex {
    mods: HashMap<String, ModIndexEntry>, // hash -> entry
}

#[derive(Debug, thiserror::Error)]
pub enum ModManagerError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Mod not found: {0}")]
    #[allow(dead_code)]
    ModNotFound(String),
    #[error("Invalid modinfo.json: {0}")]
    #[allow(dead_code)]
    InvalidModInfo(String),
}

#[command]
pub async fn get_mod_list(
    mods_path: String,
    force_refresh: Option<bool>,
) -> Result<Vec<Mod>, String> {
    let force_refresh = force_refresh.unwrap_or(false);
    let mods_dir = Path::new(&mods_path);
    let mut mods = Vec::new();

    eprintln!("Looking for mods in: {}", mods_path);

    if !mods_dir.exists() {
        eprintln!("Mods directory does not exist: {}", mods_path);
        return Ok(mods);
    }

    let disabled_dir = mods_dir.join("disabled");
    let entries =
        std::fs::read_dir(mods_dir).map_err(|e| format!("Failed to read mods directory: {}", e))?;

    let mut index = load_mod_index(); // Load index once at the start

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        // Skip the disabled directory itself
        if path == disabled_dir {
            continue;
        }

        // Check if this is a disabled mod (in the disabled folder)
        let is_in_disabled = path
            .parent()
            .and_then(|p| p.file_name())
            .and_then(|n| n.to_str())
            .map(|n| n == "disabled")
            .unwrap_or(false);

        if path.is_dir() {
            let modid = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string();

            // Check if mod is disabled (has .disabled extension or is in disabled folder)
            let enabled = !modid.ends_with(".disabled") && !is_in_disabled;

            let modinfo_path = path.join("modinfo.json");
            let info = if modinfo_path.exists() {
                read_modinfo_internal(&modinfo_path).ok()
            } else {
                eprintln!("Warning: Mod {} does not have modinfo.json", modid);
                None
            };

            eprintln!("Found mod: {} (enabled: {})", modid, enabled);

            mods.push(Mod {
                id: modid.clone(),
                name: info
                    .as_ref()
                    .and_then(|i| Some(i.name.clone()))
                    .unwrap_or_else(|| modid.clone()),
                version: info
                    .as_ref()
                    .and_then(|i| Some(i.version.clone()))
                    .unwrap_or_else(|| "unknown".to_string()),
                path: path.to_string_lossy().to_string(),
                enabled,
                info,
                is_zip: false,
                status: None,
            });
        } else if path.extension().and_then(|s| s.to_str()) == Some("zip") {
            // Handle .zip mod files (Vintage Story can load mods from .zip files)
            let hash = match hash_file(&path) {
                Ok(h) => h,
                Err(e) => {
                    eprintln!("Failed to hash zip mod {}: {}", path.display(), e);
                    continue;
                }
            };

            // Check if we already have this mod indexed
            let entry = if let Some(existing) = index.mods.get(&hash) {
                // Verify the file still exists and path matches
                if !force_refresh
                    && Path::new(&existing.file_path).exists()
                    && existing.file_path == path.to_string_lossy().to_string()
                {
                    // Use cached entry - hash matches, file exists, path matches
                    existing.clone()
                } else {
                    // Re-index the mod (force refresh or file/path changed)
                    match index_zip_mod(&path) {
                        Ok(new_entry) => {
                            index.mods.insert(hash.clone(), new_entry.clone());
                            new_entry
                        }
                        Err(e) => {
                            eprintln!("Failed to index zip mod {}: {}", path.display(), e);
                            continue;
                        }
                    }
                }
            } else {
                // New mod, index it
                match index_zip_mod(&path) {
                    Ok(new_entry) => {
                        let hash_clone = hash.clone();
                        let entry_clone = new_entry.clone();
                        index.mods.insert(hash_clone, entry_clone.clone());
                        new_entry
                    }
                    Err(e) => {
                        eprintln!("Failed to index zip mod {}: {}", path.display(), e);
                        continue;
                    }
                }
            };

            // Check if mod is disabled (has .disabled extension)
            let file_name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string();
            let enabled = !file_name.ends_with(".disabled");

            let modinfo = ModInfo {
                modid: entry.modid.clone(),
                name: entry.name.clone(),
                version: entry.version.clone(),
                description: entry.description.clone(),
                authors: entry.authors.clone(),
                website: entry.website.clone(),
                side: entry.side.clone(),
                requiredonclient: None,
                requiredonserver: None,
                dependencies: None,
            };

            eprintln!("Found zip mod: {} (enabled: {})", entry.modid, enabled);

            mods.push(Mod {
                id: entry.modid.clone(),
                name: entry.name.clone(),
                version: entry.version.clone(),
                path: path.to_string_lossy().to_string(),
                enabled,
                info: Some(modinfo),
                is_zip: true,
                status: None,
            });

            // Save updated index only if we modified it (new mod or reindexed)
            if force_refresh || !index.mods.contains_key(&hash) {
                if let Err(e) = save_mod_index(&index) {
                    eprintln!("Warning: Failed to save mod index: {}", e);
                }
            }
        }
    }

    // Also check disabled directory for both directories and zip files
    if disabled_dir.exists() {
        if let Ok(disabled_entries) = std::fs::read_dir(&disabled_dir) {
            for entry in disabled_entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    if path.is_dir() {
                        let modid = path
                            .file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or("unknown")
                            .to_string();

                        let modinfo_path = path.join("modinfo.json");
                        let info = if modinfo_path.exists() {
                            read_modinfo_internal(&modinfo_path).ok()
                        } else {
                            None
                        };

                        eprintln!("Found disabled mod: {}", modid);

                        mods.push(Mod {
                            id: modid.clone(),
                            name: info
                                .as_ref()
                                .and_then(|i| Some(i.name.clone()))
                                .unwrap_or_else(|| modid.clone()),
                            version: info
                                .as_ref()
                                .and_then(|i| Some(i.version.clone()))
                                .unwrap_or_else(|| "unknown".to_string()),
                            path: path.to_string_lossy().to_string(),
                            enabled: false,
                            info,
                            is_zip: false,
                            status: None,
                        });
                    } else if path.extension().and_then(|s| s.to_str()) == Some("zip")
                        || path.extension().and_then(|s| s.to_str()) == Some("disabled")
                    {
                        // Handle disabled zip mods (use the same index loaded at the start)
                        let hash = match hash_file(&path) {
                            Ok(h) => h,
                            Err(_) => continue,
                        };

                        if let Some(entry) = index.mods.get(&hash) {
                            let modinfo = ModInfo {
                                modid: entry.modid.clone(),
                                name: entry.name.clone(),
                                version: entry.version.clone(),
                                description: entry.description.clone(),
                                authors: entry.authors.clone(),
                                website: entry.website.clone(),
                                side: entry.side.clone(),
                                requiredonclient: None,
                                requiredonserver: None,
                                dependencies: None,
                            };

                            eprintln!("Found disabled zip mod: {}", entry.modid);

                            mods.push(Mod {
                                id: entry.modid.clone(),
                                name: entry.name.clone(),
                                version: entry.version.clone(),
                                path: path.to_string_lossy().to_string(),
                                enabled: false,
                                info: Some(modinfo),
                                is_zip: true,
                                status: None,
                            });
                        } else {
                            // Try to index it (only if not forcing refresh, otherwise skip)
                            if !force_refresh {
                                match index_zip_mod(&path) {
                                    Ok(new_entry) => {
                                        let hash_clone = hash.clone();
                                        let entry_clone = new_entry.clone();
                                        index.mods.insert(hash_clone, entry_clone.clone());

                                        let modinfo = ModInfo {
                                            modid: new_entry.modid.clone(),
                                            name: new_entry.name.clone(),
                                            version: new_entry.version.clone(),
                                            description: new_entry.description.clone(),
                                            authors: new_entry.authors.clone(),
                                            website: new_entry.website.clone(),
                                            side: new_entry.side.clone(),
                                            requiredonclient: None,
                                            requiredonserver: None,
                                            dependencies: None,
                                        };

                                        mods.push(Mod {
                                            id: new_entry.modid.clone(),
                                            name: new_entry.name.clone(),
                                            version: new_entry.version.clone(),
                                            path: path.to_string_lossy().to_string(),
                                            enabled: false,
                                            info: Some(modinfo),
                                            is_zip: true,
                                            status: None,
                                        });

                                        if let Err(e) = save_mod_index(&index) {
                                            eprintln!("Warning: Failed to save mod index: {}", e);
                                        }
                                    }
                                    Err(e) => {
                                        eprintln!(
                                            "Failed to index disabled zip mod {}: {}",
                                            path.display(),
                                            e
                                        );
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    eprintln!("Total mods found: {}", mods.len());
    Ok(mods)
}

#[command]
pub async fn enable_mods(mods_path: String, mod_ids: Vec<String>) -> Result<(), String> {
    let mods_dir = Path::new(&mods_path);
    let disabled_dir = mods_dir.join("disabled");
    let mut index = load_mod_index();

    for mod_id in mod_ids {
        // First, try to find the mod in the index (for zip mods)
        let mut found_in_index = false;
        let mut hash_to_update: Option<String> = None;
        let mut target_path: Option<PathBuf> = None;
        let mut target_name: Option<String> = None;

        for (hash, entry) in index.mods.iter() {
            if entry.modid == mod_id {
                let current_path = Path::new(&entry.file_path);
                if current_path.exists() && current_path.parent() == Some(disabled_dir.as_path()) {
                    // This is a disabled zip mod, enable it
                    let file_name = current_path
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("")
                        .to_string();

                    // Determine target filename (remove .disabled extension if present)
                    let tgt_name = if file_name.ends_with(".disabled") {
                        file_name.trim_end_matches(".disabled").to_string()
                    } else if !file_name.ends_with(".zip") {
                        format!("{}.zip", file_name)
                    } else {
                        file_name
                    };

                    let tgt_path = mods_dir.join(&tgt_name);

                    std::fs::rename(current_path, &tgt_path)
                        .map_err(|e| format!("Failed to enable mod {}: {}", mod_id, e))?;

                    hash_to_update = Some(hash.clone());
                    target_path = Some(tgt_path);
                    target_name = Some(tgt_name);
                    found_in_index = true;
                    break;
                }
            }
        }

        // Update index after iteration
        if let (Some(hash), Some(tgt_path), Some(tgt_name)) =
            (hash_to_update, target_path, target_name)
        {
            if let Some(entry) = index.mods.get_mut(&hash) {
                entry.file_path = tgt_path.to_string_lossy().to_string();
                entry.file_name = tgt_name;
            }
        }

        if found_in_index {
            continue;
        }

        // Try to find the mod in disabled directory (could be directory or zip)
        let mod_path = disabled_dir.join(&mod_id);
        let mod_path_zip = disabled_dir.join(format!("{}.zip", mod_id));
        let mod_path_disabled = disabled_dir.join(format!("{}.disabled", mod_id));

        let (source_path, target_path) = if mod_path.exists() && mod_path.is_dir() {
            // Directory mod
            (mod_path.clone(), mods_dir.join(&mod_id))
        } else if mod_path_zip.exists() {
            // Zip mod with .zip extension
            (
                mod_path_zip.clone(),
                mods_dir.join(format!("{}.zip", mod_id)),
            )
        } else if mod_path_disabled.exists() {
            // Zip mod with .disabled extension
            let target = mods_dir.join(format!("{}.zip", mod_id));
            (mod_path_disabled.clone(), target)
        } else {
            // Mod not found or already enabled
            continue;
        };

        if source_path.exists() {
            std::fs::rename(&source_path, &target_path)
                .map_err(|e| format!("Failed to enable mod {}: {}", mod_id, e))?;

            // Update index if it's a zip mod
            if let Some(ext) = target_path.extension() {
                if ext == "zip" {
                    if let Ok(hash) = hash_file(&target_path) {
                        if let Some(entry) = index.mods.get_mut(&hash) {
                            entry.file_path = target_path.to_string_lossy().to_string();
                            entry.file_name = target_path
                                .file_name()
                                .and_then(|n| n.to_str())
                                .unwrap_or("")
                                .to_string();
                        }
                    }
                }
            }
        }
    }

    save_mod_index(&index).map_err(|e| format!("Failed to save mod index: {}", e))?;
    Ok(())
}

#[command]
pub async fn disable_mods(mods_path: String, mod_ids: Vec<String>) -> Result<(), String> {
    let mods_dir = Path::new(&mods_path);
    let disabled_dir = mods_dir.join("disabled");
    let mut index = load_mod_index();

    // Create disabled directory if it doesn't exist
    if !disabled_dir.exists() {
        std::fs::create_dir_all(&disabled_dir)
            .map_err(|e| format!("Failed to create disabled directory: {}", e))?;
    }

    for mod_id in mod_ids {
        // First, try to find the mod in the index (for zip mods)
        let mut found_in_index = false;
        let mut hash_to_update: Option<String> = None;
        let mut target_path: Option<PathBuf> = None;

        for (hash, entry) in index.mods.iter() {
            if entry.modid == mod_id {
                let current_path = Path::new(&entry.file_path);
                if current_path.exists() && current_path.parent() == Some(mods_dir) {
                    // This is an enabled zip mod, disable it
                    let tgt_path = disabled_dir.join(format!("{}.disabled", mod_id));

                    std::fs::rename(current_path, &tgt_path)
                        .map_err(|e| format!("Failed to disable mod {}: {}", mod_id, e))?;

                    hash_to_update = Some(hash.clone());
                    target_path = Some(tgt_path);
                    found_in_index = true;
                    break;
                }
            }
        }

        // Update index after iteration
        if let (Some(hash), Some(tgt_path)) = (hash_to_update, target_path) {
            if let Some(entry) = index.mods.get_mut(&hash) {
                entry.file_path = tgt_path.to_string_lossy().to_string();
                entry.file_name = tgt_path
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("")
                    .to_string();
            }
        }

        if found_in_index {
            continue;
        }

        // Try directory first, then zip file
        let mod_path = mods_dir.join(&mod_id);
        let mod_path_zip = mods_dir.join(format!("{}.zip", mod_id));

        let (source_path, target_path) = if mod_path.exists() && mod_path.is_dir() {
            // Directory mod
            (mod_path.clone(), disabled_dir.join(&mod_id))
        } else if mod_path_zip.exists() {
            // Zip mod - rename to .disabled extension
            let target = disabled_dir.join(format!("{}.disabled", mod_id));
            (mod_path_zip.clone(), target)
        } else {
            continue;
        };

        if source_path.exists() {
            std::fs::rename(&source_path, &target_path)
                .map_err(|e| format!("Failed to disable mod {}: {}", mod_id, e))?;

            // Update index if it's a zip mod
            if let Some(ext) = source_path.extension() {
                if ext == "zip" {
                    if let Ok(hash) = hash_file(&target_path) {
                        if let Some(entry) = index.mods.get_mut(&hash) {
                            entry.file_path = target_path.to_string_lossy().to_string();
                            entry.file_name = target_path
                                .file_name()
                                .and_then(|n| n.to_str())
                                .unwrap_or("")
                                .to_string();
                        }
                    }
                }
            }
        }
    }

    save_mod_index(&index).map_err(|e| format!("Failed to save mod index: {}", e))?;
    Ok(())
}

#[command]
pub async fn read_modinfo(modinfo_path: String) -> Result<ModInfo, String> {
    read_modinfo_internal(Path::new(&modinfo_path)).map_err(|e| e.to_string())
}

fn read_modinfo_internal(path: &Path) -> Result<ModInfo, ModManagerError> {
    let content = std::fs::read_to_string(path)?;
    let info: ModInfo = serde_json::from_str(&content)?;
    Ok(info)
}

fn get_index_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or("Failed to get config directory")?
        .join("vs-mod-loader");
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create config directory: {}", e))?;
    Ok(config_dir.join("mod-index.json"))
}

fn load_mod_index() -> ModIndex {
    let index_path = match get_index_path() {
        Ok(p) => p,
        Err(_) => {
            return ModIndex {
                mods: HashMap::new(),
            }
        }
    };

    if !index_path.exists() {
        return ModIndex {
            mods: HashMap::new(),
        };
    }

    match std::fs::read_to_string(&index_path) {
        Ok(content) => match serde_json::from_str::<ModIndex>(&content) {
            Ok(index) => index,
            Err(e) => {
                eprintln!("Failed to parse mod index: {}", e);
                ModIndex {
                    mods: HashMap::new(),
                }
            }
        },
        Err(e) => {
            eprintln!("Failed to read mod index: {}", e);
            ModIndex {
                mods: HashMap::new(),
            }
        }
    }
}

fn save_mod_index(index: &ModIndex) -> Result<(), String> {
    let index_path = get_index_path()?;
    let content = serde_json::to_string_pretty(index)
        .map_err(|e| format!("Failed to serialize mod index: {}", e))?;
    std::fs::write(&index_path, content)
        .map_err(|e| format!("Failed to write mod index: {}", e))?;
    Ok(())
}

fn hash_file(path: &Path) -> Result<String, String> {
    let mut file =
        File::open(path).map_err(|e| format!("Failed to open file for hashing: {}", e))?;
    let mut hasher = Sha256::new();
    let mut buffer = vec![0u8; 8192];

    loop {
        let bytes_read = file
            .read(&mut buffer)
            .map_err(|e| format!("Failed to read file for hashing: {}", e))?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }

    Ok(hex::encode(hasher.finalize()))
}

fn extract_modinfo_from_zip(zip_path: &Path) -> Result<ModInfo, String> {
    let file = File::open(zip_path).map_err(|e| format!("Failed to open zip file: {}", e))?;
    let mut archive =
        ZipArchive::new(file).map_err(|e| format!("Failed to read zip archive: {}", e))?;

    // Try common paths for modinfo.json
    let modinfo_paths = vec!["modinfo.json", "mod/modinfo.json", "assets/modinfo.json"];

    for modinfo_path in modinfo_paths {
        if let Ok(mut file) = archive.by_name(modinfo_path) {
            let mut content = String::new();
            file.read_to_string(&mut content)
                .map_err(|e| format!("Failed to read modinfo.json from zip: {}", e))?;

            let info: ModInfo = serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse modinfo.json: {}", e))?;
            return Ok(info);
        }
    }

    Err("modinfo.json not found in zip file".to_string())
}

fn index_zip_mod(zip_path: &Path) -> Result<ModIndexEntry, String> {
    let hash = hash_file(zip_path)?;
    let modinfo = extract_modinfo_from_zip(zip_path)?;

    let file_name = zip_path
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid file name")?
        .to_string();

    Ok(ModIndexEntry {
        hash: hash.clone(),
        modid: modinfo.modid.clone(),
        name: modinfo.name.clone(),
        version: modinfo.version.clone(),
        description: modinfo.description.clone(),
        authors: modinfo.authors.clone(),
        website: modinfo.website.clone(),
        side: modinfo.side.clone(),
        download_url: None,
        thumbnail_url: None,
        category: None,
        tags: vec![],
        file_name: file_name.clone(),
        file_path: zip_path.to_string_lossy().to_string(),
    })
}

#[command]
pub async fn list_config_files(mod_path: String) -> Result<Vec<String>, String> {
    let mod_dir = Path::new(&mod_path);
    let mut config_files = Vec::new();

    if !mod_dir.exists() {
        return Ok(config_files);
    }

    let entries = std::fs::read_dir(mod_dir).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.is_file() {
            if let Some(ext) = path.extension() {
                if ext == "json" {
                    if let Some(name) = path.file_name() {
                        config_files.push(name.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    Ok(config_files)
}

#[command]
pub async fn read_config(mod_path: String, file_name: String) -> Result<String, String> {
    let config_path = Path::new(&mod_path).join(&file_name);
    std::fs::read_to_string(&config_path).map_err(|e| format!("Failed to read config file: {}", e))
}

#[command]
pub async fn write_config(
    mod_path: String,
    file_name: String,
    content: String,
) -> Result<(), String> {
    let config_path = Path::new(&mod_path).join(&file_name);
    std::fs::write(&config_path, content).map_err(|e| format!("Failed to write config file: {}", e))
}

#[command]
pub async fn reindex_mod(mods_path: String, mod_id: String) -> Result<(), String> {
    let mods_dir = Path::new(&mods_path);
    let mod_path = mods_dir.join(format!("{}.zip", mod_id));

    if !mod_path.exists() {
        return Err(format!("Mod file not found: {}", mod_path.display()));
    }

    let mut index = load_mod_index();
    match index_zip_mod(&mod_path) {
        Ok(new_entry) => {
            let hash =
                hash_file(&mod_path).map_err(|e| format!("Failed to hash mod file: {}", e))?;
            index.mods.insert(hash, new_entry);
            save_mod_index(&index).map_err(|e| format!("Failed to save mod index: {}", e))?;
            Ok(())
        }
        Err(e) => Err(format!("Failed to index mod: {}", e)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    #[test]
    fn test_read_modinfo() {
        let temp_dir = TempDir::new().unwrap();
        let modinfo_path = temp_dir.path().join("modinfo.json");

        let modinfo_json = r#"{
            "modid": "testmod",
            "name": "Test Mod",
            "version": "1.0.0",
            "authors": ["Test Author"],
            "description": "A test mod"
        }"#;

        fs::write(&modinfo_path, modinfo_json).unwrap();

        let result = read_modinfo_internal(&modinfo_path);
        assert!(result.is_ok());
        let info = result.unwrap();
        assert_eq!(info.modid, "testmod");
        assert_eq!(info.name, "Test Mod");
        assert_eq!(info.version, "1.0.0");
    }

    #[test]
    fn test_list_config_files() {
        let temp_dir = TempDir::new().unwrap();
        let mod_dir = temp_dir.path();

        // Create some test files
        fs::write(mod_dir.join("config.json"), "{}").unwrap();
        fs::write(mod_dir.join("other.txt"), "text").unwrap();
        fs::write(mod_dir.join("another.json"), "{}").unwrap();

        // This would need to be called via command, but we can test the logic
        let entries = fs::read_dir(mod_dir).unwrap();
        let mut json_files = Vec::new();

        for entry in entries {
            let path = entry.unwrap().path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext == "json" {
                        if let Some(name) = path.file_name() {
                            json_files.push(name.to_string_lossy().to_string());
                        }
                    }
                }
            }
        }

        assert_eq!(json_files.len(), 2);
        assert!(json_files.contains(&"config.json".to_string()));
        assert!(json_files.contains(&"another.json".to_string()));
    }
}
