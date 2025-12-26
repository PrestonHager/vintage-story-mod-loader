use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModPack {
    pub name: String,
    pub version: String,
    pub description: String,
    pub mods: Vec<ModPackMod>,
    pub metadata: ModPackMetadata,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModPackMod {
    pub id: String,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>, // Optional URL to download the mod directly
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hash: Option<String>, // SHA256 hash of the mod file for verification
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModPackMetadata {
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub screenshots: Option<Vec<String>>,
    pub status: Option<String>,
    pub url_alias: Option<String>,
    pub summary: Option<String>,
    pub text: Option<String>,
    pub links: Option<ModPackLinks>,
    pub side: Option<String>,
    pub moddb_logo: Option<String>,
    pub external_logo: Option<String>,
    pub thumbnail: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModPackLinks {
    pub homepage: Option<String>,
    pub trailer: Option<String>,
    pub source: Option<String>,
    pub issues: Option<String>,
    pub wiki: Option<String>,
    pub donate: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum ModPackError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("Validation error: {0}")]
    Validation(String),
}

impl ModPack {
    pub fn validate(&self, strict: bool) -> Result<(), ModPackError> {
        if self.name.is_empty() {
            return Err(ModPackError::Validation("Mod pack name cannot be empty".to_string()));
        }
        if strict && self.version.is_empty() {
            return Err(ModPackError::Validation("Mod pack version cannot be empty".to_string()));
        }
        if strict && self.mods.is_empty() {
            return Err(ModPackError::Validation("Mod pack must contain at least one mod".to_string()));
        }
        if let Some(ref summary) = self.metadata.summary {
            if summary.len() > 100 {
                if strict {
                    return Err(ModPackError::Validation("Summary must be 100 characters or less".to_string()));
                } else {
                    eprintln!("[validate] WARNING: Summary exceeds 100 characters ({} chars). This is allowed for imports but may cause issues when submitting to the mod database.", summary.len());
                }
            }
        }
        Ok(())
    }

    pub fn from_file(path: &Path) -> Result<Self, ModPackError> {
        let content = std::fs::read_to_string(path)?;
        let pack: ModPack = serde_json::from_str(&content)?;
        // Use non-strict validation for imports (allow missing version, empty mods list)
        pack.validate(false)?;
        Ok(pack)
    }

    pub fn to_file(&self, path: &Path) -> Result<(), ModPackError> {
        // Use strict validation for exports
        self.validate(true)?;
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(path, content)?;
        Ok(())
    }
}

#[tauri::command]
pub async fn create_mod_pack(pack: ModPack) -> Result<ModPack, String> {
    pack.validate(true).map_err(|e| e.to_string())?;
    Ok(pack)
}

#[tauri::command]
pub async fn export_mod_pack(pack: ModPack, file_path: String) -> Result<(), String> {
    let path = Path::new(&file_path);
    pack.to_file(path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn import_mod_pack(file_path: String) -> Result<ModPack, String> {
    eprintln!("[import_mod_pack] Starting import process");
    eprintln!("[import_mod_pack] Received file_path: {}", file_path);
    
    let path = Path::new(&file_path);
    eprintln!("[import_mod_pack] Path object created: {:?}", path);
    
    if !path.exists() {
        let err = format!("File does not exist: {}", file_path);
        eprintln!("[import_mod_pack] ERROR: {}", err);
        return Err(err);
    }
    
    eprintln!("[import_mod_pack] File exists, checking if it's a file...");
    if !path.is_file() {
        let err = format!("Path is not a file: {}", file_path);
        eprintln!("[import_mod_pack] ERROR: {}", err);
        return Err(err);
    }
    
    eprintln!("[import_mod_pack] Attempting to import mod pack from file...");
    match ModPack::from_file(path) {
        Ok(pack) => {
            eprintln!("[import_mod_pack] Mod pack imported successfully");
            eprintln!("[import_mod_pack] Mod pack name: {}", pack.name);
            eprintln!("[import_mod_pack] Mod pack version: {}", pack.version);
            eprintln!("[import_mod_pack] Number of mods: {}", pack.mods.len());
            Ok(pack)
        }
        Err(e) => {
            let err = format!("Failed to import mod pack: {}", e);
            eprintln!("[import_mod_pack] ERROR: {}", err);
            Err(err)
        }
    }
}

