use std::path::PathBuf;

#[tauri::command]
pub async fn detect_vintage_story_path() -> Result<Option<String>, String> {
    let possible_paths = get_default_paths();

    for path in possible_paths {
        if path.exists() && path.join("Mods").exists() {
            return Ok(Some(path.to_string_lossy().to_string()));
        }
    }

    Ok(None)
}

#[tauri::command]
pub async fn get_vintage_story_path() -> Result<String, String> {
    // Get the mods directory path based on platform
    let mods_path =
        get_mods_directory_path().ok_or("Failed to determine Vintage Story mods directory")?;

    Ok(mods_path.to_string_lossy().to_string())
}

fn get_default_paths() -> Vec<PathBuf> {
    let mut paths = Vec::new();

    #[cfg(target_os = "windows")]
    {
        if let Some(appdata) = std::env::var_os("APPDATA") {
            paths.push(PathBuf::from(appdata).join("VintagestoryData"));
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Some(home) = std::env::var_os("HOME") {
            paths.push(PathBuf::from(home).join(".config").join("VintagestoryData"));
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Some(home) = std::env::var_os("HOME") {
            paths.push(
                PathBuf::from(home)
                    .join("Library")
                    .join("Application Support")
                    .join("VintagestoryData"),
            );
        }
    }

    paths
}

fn get_mods_directory_path() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var_os("APPDATA").map(|p| PathBuf::from(p).join("VintagestoryData").join("Mods"))
    }

    #[cfg(target_os = "linux")]
    {
        std::env::var_os("HOME").map(|p| {
            PathBuf::from(p)
                .join(".config")
                .join("VintagestoryData")
                .join("Mods")
        })
    }

    #[cfg(target_os = "macos")]
    {
        std::env::var_os("HOME").map(|p| {
            PathBuf::from(p)
                .join("Library")
                .join("Application Support")
                .join("VintagestoryData")
                .join("Mods")
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_default_paths() {
        let paths = get_default_paths();
        // Should return at least one path if HOME/APPDATA is set
        // This test verifies the function doesn't panic
        // paths.len() is always >= 0 since usize is unsigned, so no assertion needed
    }

    #[test]
    fn test_get_mods_directory_path() {
        let path = get_mods_directory_path();
        // Should return Some if HOME/APPDATA is set
        // This test verifies the function doesn't panic
        if path.is_some() {
            let p = path.unwrap();
            assert!(p.to_string_lossy().contains("Mods"));
        }
    }
}
