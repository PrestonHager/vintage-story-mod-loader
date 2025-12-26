use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use dirs;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub vintage_story_path: Option<String>,
    pub mods_path: Option<String>,
    pub api_username: Option<String>,
    pub api_password: Option<String>,
    pub theme: String,
    pub default_mod_pack_location: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            vintage_story_path: None,
            mods_path: None,
            api_username: None,
            api_password: None,
            theme: "light".to_string(),
            default_mod_pack_location: None,
        }
    }
}

fn get_config_path() -> Result<PathBuf, String> {
    let config_dir = dirs::config_dir()
        .ok_or("Failed to get config directory")?
        .join("vs-mod-loader");
    std::fs::create_dir_all(&config_dir)
        .map_err(|e| format!("Failed to create config directory: {}", e))?;
    Ok(config_dir.join("config.json"))
}

#[tauri::command]
pub async fn get_settings() -> Result<Settings, String> {
    let config_path = get_config_path()?;

    if !config_path.exists() {
        return Ok(Settings::default());
    }

    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read settings: {}", e))?;

    let settings: Settings = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse settings: {}", e))?;

    Ok(settings)
}

#[tauri::command]
pub async fn save_settings(settings: Settings) -> Result<(), String> {
    let config_path = get_config_path()?;

    let content = serde_json::to_string_pretty(&settings)
        .map_err(|e| format!("Failed to serialize settings: {}", e))?;

    std::fs::write(&config_path, content)
        .map_err(|e| format!("Failed to write settings: {}", e))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;

    #[test]
    fn test_settings_default() {
        let settings = Settings::default();
        assert_eq!(settings.theme, "light");
        assert!(settings.vintage_story_path.is_none());
    }

    #[test]
    fn test_settings_serialization() {
        let settings = Settings {
            theme: "dark".to_string(),
            vintage_story_path: Some("/test/path".to_string()),
            ..Default::default()
        };

        let json = serde_json::to_string(&settings).unwrap();
        let deserialized: Settings = serde_json::from_str(&json).unwrap();
        
        assert_eq!(deserialized.theme, "dark");
        assert_eq!(deserialized.vintage_story_path, Some("/test/path".to_string()));
    }
}
