use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const MOD_DB_BASE_URL: &str = "https://mods.vintagestory.at";

#[derive(Debug, Serialize, Deserialize)]
#[serde(default)]
pub struct ModDatabaseMod {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub version: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub download_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub category: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

impl Default for ModDatabaseMod {
    fn default() -> Self {
        Self {
            id: String::new(),
            name: String::new(),
            version: String::new(),
            description: None,
            author: None,
            download_url: None,
            thumbnail_url: None,
            category: None,
            tags: vec![],
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ModSearchResult {
    pub mods: Vec<ModDatabaseMod>,
    pub total: usize,
    pub page: usize,
    pub per_page: usize,
}

// ApiClientError removed - using String errors directly for simplicity

#[tauri::command]
pub async fn search_mods(query: Option<String>, page: Option<usize>) -> Result<ModSearchResult, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let page = page.unwrap_or(1);
    
    // Try to use the actual API endpoint, fallback to mock data if it fails
    let url = format!("{}/api/mods", MOD_DB_BASE_URL);
    
    let mut params = HashMap::new();
    params.insert("page", page.to_string());
    if let Some(q) = query {
        params.insert("q", q);
    }

    match client
        .get(&url)
        .query(&params)
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                // Try to parse as JSON first
                let text = response.text().await.unwrap_or_default();
                if let Ok(result) = serde_json::from_str::<ModSearchResult>(&text) {
                    return Ok(result);
                }
                // If that fails, try to parse as a generic JSON object and extract mods
                if let Ok(json_value) = serde_json::from_str::<serde_json::Value>(&text) {
                    // Try to extract mods array from various possible structures
                    if let Some(mods_array) = json_value.get("mods").or_else(|| json_value.get("data"))
                        .and_then(|v| v.as_array()) {
                        let mut mods = Vec::new();
                        for mod_value in mods_array {
                            if let Ok(mod_data) = serde_json::from_value::<ModDatabaseMod>(mod_value.clone()) {
                                mods.push(mod_data);
                            }
                        }
                        if !mods.is_empty() {
                            let total = mods.len();
                            return Ok(ModSearchResult {
                                mods,
                                total,
                                page,
                                per_page: 20,
                            });
                        }
                    }
                }
                eprintln!("Failed to parse API response structure");
                // Fall through to mock data
            } else {
                eprintln!("API returned error status: {}", response.status());
                // Fall through to mock data
            }
        }
        Err(e) => {
            eprintln!("API request failed: {}. Using mock data.", e);
            // Fall through to mock data
        }
    }

    // Return mock data structure for development
    Ok(ModSearchResult {
        mods: vec![],
        total: 0,
        page,
        per_page: 20,
    })
}

#[tauri::command]
pub async fn get_mod_details(mod_id: String) -> Result<ModDatabaseMod, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let url = format!("{}/api/mods/{}", MOD_DB_BASE_URL, mod_id);

    match client.get(&url).send().await {
        Ok(response) => {
            if response.status().is_success() {
                match response.json::<ModDatabaseMod>().await {
                    Ok(mod_data) => return Ok(mod_data),
                    Err(e) => {
                        eprintln!("Failed to parse mod details: {}", e);
                    }
                }
            }
        }
        Err(e) => {
            eprintln!("Failed to get mod details: {}", e);
        }
    }

    // Return mock data structure
    Ok(ModDatabaseMod {
        id: mod_id.clone(),
        name: mod_id,
        version: "1.0.0".to_string(),
        description: None,
        author: None,
        download_url: None,
        thumbnail_url: None,
        category: None,
        tags: vec![],
    })
}

#[tauri::command]
pub async fn download_mod(mod_id: String, download_url: String, mods_path: String) -> Result<String, String> {
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

