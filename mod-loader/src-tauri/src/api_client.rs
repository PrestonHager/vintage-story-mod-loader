use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const MOD_DB_BASE_URL: &str = "https://mods.vintagestory.at";

#[derive(Debug, Serialize, Deserialize)]
pub struct ModDatabaseMod {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub download_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub category: Option<String>,
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModSearchResult {
    pub mods: Vec<ModDatabaseMod>,
    pub total: usize,
    pub page: usize,
    pub per_page: usize,
}

#[derive(Debug, thiserror::Error)]
pub enum ApiClientError {
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    #[error("API error: {0}")]
    Api(String),
}

#[tauri::command]
pub async fn search_mods(query: Option<String>, page: Option<usize>) -> Result<ModSearchResult, String> {
    let client = reqwest::Client::new();
    let page = page.unwrap_or(1);
    
    // TODO: Discover actual API endpoint
    // For now, return mock data structure
    let url = format!("{}/api/mods", MOD_DB_BASE_URL);
    
    let mut params = HashMap::new();
    params.insert("page", page.to_string());
    if let Some(q) = query {
        params.insert("q", q);
    }

    let response = client
        .get(&url)
        .query(&params)
        .send()
        .await
        .map_err(|e| format!("Failed to search mods: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API returned error: {}", response.status()));
    }

    let result: ModSearchResult = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(result)
}

#[tauri::command]
pub async fn get_mod_details(mod_id: String) -> Result<ModDatabaseMod, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/api/mods/{}", MOD_DB_BASE_URL, mod_id);

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to get mod details: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("API returned error: {}", response.status()));
    }

    let mod_data: ModDatabaseMod = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(mod_data)
}

#[tauri::command]
pub async fn download_mod(mod_id: String, download_url: String, mods_path: String) -> Result<String, String> {
    use std::io::Write;
    use zip::ZipArchive;
    
    let client = reqwest::Client::new();

    let response = client
        .get(&download_url)
        .send()
        .await
        .map_err(|e| format!("Failed to download mod: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed: {}", response.status()));
    }

    let bytes = response.bytes().await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    // Create temporary file for zip
    let temp_dir = std::env::temp_dir();
    let temp_zip = temp_dir.join(format!("{}.zip", mod_id));
    std::fs::write(&temp_zip, bytes)
        .map_err(|e| format!("Failed to save temp file: {}", e))?;

    // Extract zip to mods directory
    let mods_dir = std::path::Path::new(&mods_path);
    let file = std::fs::File::open(&temp_zip)
        .map_err(|e| format!("Failed to open zip file: {}", e))?;
    
    let mut archive = ZipArchive::new(file)
        .map_err(|e| format!("Failed to read zip archive: {}", e))?;

    // Extract to mods directory
    let extract_path = mods_dir.join(&mod_id);
    if extract_path.exists() {
        std::fs::remove_dir_all(&extract_path)
            .map_err(|e| format!("Failed to remove existing mod: {}", e))?;
    }
    std::fs::create_dir_all(&extract_path)
        .map_err(|e| format!("Failed to create mod directory: {}", e))?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("Failed to read file from archive: {}", e))?;
        
        let outpath = extract_path.join(file.name());
        
        if file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        } else {
            if let Some(p) = outpath.parent() {
                std::fs::create_dir_all(p)
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }
            let mut outfile = std::fs::File::create(&outpath)
                .map_err(|e| format!("Failed to create file: {}", e))?;
            std::io::copy(&mut file, &mut outfile)
                .map_err(|e| format!("Failed to write file: {}", e))?;
        }
    }

    // Clean up temp file
    let _ = std::fs::remove_file(&temp_zip);

    // Verify modinfo.json exists
    let modinfo_path = extract_path.join("modinfo.json");
    if !modinfo_path.exists() {
        return Err("Mod does not contain modinfo.json".to_string());
    }

    Ok(extract_path.to_string_lossy().to_string())
}

