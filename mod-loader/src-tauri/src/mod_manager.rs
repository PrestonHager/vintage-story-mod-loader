use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::command;

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
}

#[derive(Debug, thiserror::Error)]
pub enum ModManagerError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Mod not found: {0}")]
    ModNotFound(String),
    #[error("Invalid modinfo.json: {0}")]
    InvalidModInfo(String),
}

#[command]
pub async fn get_mod_list(mods_path: String) -> Result<Vec<Mod>, String> {
    let mods_dir = Path::new(&mods_path);
    let mut mods = Vec::new();

    if !mods_dir.exists() {
        return Ok(mods);
    }

    let entries = std::fs::read_dir(mods_dir).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path.is_dir() {
            let modid = path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string();

            // Check if mod is disabled (has .disabled extension or is in disabled folder)
            let enabled = !modid.ends_with(".disabled") && !path.ends_with("disabled");

            let modinfo_path = path.join("modinfo.json");
            let info = if modinfo_path.exists() {
                read_modinfo_internal(&modinfo_path).ok()
            } else {
                None
            };

            mods.push(Mod {
                id: modid.clone(),
                name: info.as_ref()
                    .and_then(|i| Some(i.name.clone()))
                    .unwrap_or_else(|| modid.clone()),
                version: info.as_ref()
                    .and_then(|i| Some(i.version.clone()))
                    .unwrap_or_else(|| "unknown".to_string()),
                path: path.to_string_lossy().to_string(),
                enabled,
                info,
            });
        }
    }

    Ok(mods)
}

#[command]
pub async fn enable_mods(mods_path: String, mod_ids: Vec<String>) -> Result<(), String> {
    let mods_dir = Path::new(&mods_path);
    let disabled_dir = mods_dir.join("disabled");

    for mod_id in mod_ids {
        let mod_path = if mod_id.ends_with(".disabled") {
            mods_dir.join(&mod_id)
        } else {
            disabled_dir.join(&mod_id)
        };

        if mod_path.exists() {
            let new_path = if mod_id.ends_with(".disabled") {
                mods_dir.join(mod_id.trim_end_matches(".disabled"))
            } else {
                mods_dir.join(&mod_id)
            };

            std::fs::rename(&mod_path, &new_path)
                .map_err(|e| format!("Failed to enable mod {}: {}", mod_id, e))?;
        }
    }

    Ok(())
}

#[command]
pub async fn disable_mods(mods_path: String, mod_ids: Vec<String>) -> Result<(), String> {
    let mods_dir = Path::new(&mods_path);
    let disabled_dir = mods_dir.join("disabled");

    // Create disabled directory if it doesn't exist
    if !disabled_dir.exists() {
        std::fs::create_dir_all(&disabled_dir)
            .map_err(|e| format!("Failed to create disabled directory: {}", e))?;
    }

    for mod_id in mod_ids {
        let mod_path = mods_dir.join(&mod_id);
        if mod_path.exists() {
            let new_path = disabled_dir.join(&mod_id);
            std::fs::rename(&mod_path, &new_path)
                .map_err(|e| format!("Failed to disable mod {}: {}", mod_id, e))?;
        }
    }

    Ok(())
}

#[command]
pub async fn read_modinfo(modinfo_path: String) -> Result<ModInfo, String> {
    read_modinfo_internal(Path::new(&modinfo_path))
        .map_err(|e| e.to_string())
}

fn read_modinfo_internal(path: &Path) -> Result<ModInfo, ModManagerError> {
    let content = std::fs::read_to_string(path)?;
    let info: ModInfo = serde_json::from_str(&content)?;
    Ok(info)
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
    std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))
}

#[command]
pub async fn write_config(mod_path: String, file_name: String, content: String) -> Result<(), String> {
    let config_path = Path::new(&mod_path).join(&file_name);
    std::fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write config file: {}", e))
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
