use serde::{Deserialize, Serialize};
use std::collections::HashMap;

const MOD_DB_BASE_URL: &str = "https://mods.vintagestory.at";

// Structure for API response from /api/mods/{mod_id}
#[derive(Debug, Deserialize)]
struct ModApiResponse {
    #[serde(rename = "mod")]
    mod_data: Option<ModApiData>,
}

#[derive(Debug, Deserialize)]
struct ModApiData {
    releases: Option<Vec<ModRelease>>,
    name: Option<String>,
    description: Option<String>,
    #[serde(rename = "author")]
    author_name: Option<String>,
    version: Option<String>,
    thumbnail: Option<String>,
    category: Option<String>,
    tags: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct ModRelease {
    mainfile: Option<String>,
    version: Option<String>,
}

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
                // Read response text first so we can parse it multiple times if needed
                match response.text().await {
                    Ok(text) => {
                        // Try to parse as the actual API response structure first
                        match serde_json::from_str::<ModApiResponse>(&text) {
                            Ok(api_response) => {
                                if let Some(mod_data) = api_response.mod_data {
                                    // Extract download URL from the latest release
                                    let download_url = mod_data.releases
                                        .as_ref()
                                        .and_then(|releases| {
                                            // Get the first (latest) release's mainfile URL
                                            releases.first()
                                                .and_then(|release| release.mainfile.clone())
                                        });

                                    // Extract version from latest release or mod data
                                    let version = mod_data.releases
                                        .as_ref()
                                        .and_then(|releases| {
                                            releases.first()
                                                .and_then(|release| release.version.clone())
                                        })
                                        .or(mod_data.version)
                                        .unwrap_or_else(|| "unknown".to_string());

                                    eprintln!("[get_mod_details] Found mod: {}, download_url: {:?}", mod_id, download_url);

                                    return Ok(ModDatabaseMod {
                                        id: mod_id.clone(),
                                        name: mod_data.name.unwrap_or_else(|| mod_id.clone()),
                                        version,
                                        description: mod_data.description,
                                        author: mod_data.author_name,
                                        download_url,
                                        thumbnail_url: mod_data.thumbnail,
                                        category: mod_data.category,
                                        tags: mod_data.tags.unwrap_or_default(),
                                    });
                                }
                            }
                            Err(e) => {
                                eprintln!("[get_mod_details] Failed to parse as ModApiResponse: {}", e);
                                // Fall through to try parsing as ModDatabaseMod directly
                            }
                        }

                        // Fallback: try parsing as ModDatabaseMod directly (for other API formats)
                        match serde_json::from_str::<ModDatabaseMod>(&text) {
                            Ok(mod_data) => return Ok(mod_data),
                            Err(e) => {
                                eprintln!("[get_mod_details] Failed to parse mod details: {}", e);
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("[get_mod_details] Failed to read response text: {}", e);
                    }
                }
            } else {
                eprintln!("[get_mod_details] API returned status: {}", response.status());
            }
        }
        Err(e) => {
            eprintln!("[get_mod_details] Failed to get mod details: {}", e);
        }
    }

    // Return mock data structure
    eprintln!("[get_mod_details] Returning mock data for mod: {}", mod_id);
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
    use std::io::Read;
    
    let client = reqwest::Client::new();

    eprintln!("[download_mod] Downloading mod {} from {}", mod_id, download_url);
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

    eprintln!("[download_mod] Downloaded {} bytes", bytes.len());

    // Save zip file directly to mods directory
    let mods_dir = std::path::Path::new(&mods_path);
    let zip_path = mods_dir.join(format!("{}.zip", mod_id));
    
    // Remove existing mod (either zip or directory)
    if zip_path.exists() {
        std::fs::remove_file(&zip_path)
            .map_err(|e| format!("Failed to remove existing zip: {}", e))?;
    }
    let dir_path = mods_dir.join(&mod_id);
    if dir_path.exists() && dir_path.is_dir() {
        std::fs::remove_dir_all(&dir_path)
            .map_err(|e| format!("Failed to remove existing mod directory: {}", e))?;
    }

    // Write zip file directly
    std::fs::write(&zip_path, bytes)
        .map_err(|e| format!("Failed to save zip file: {}", e))?;

    eprintln!("[download_mod] Saved zip file to: {:?}", zip_path);

    // Verify it's a valid zip and contains modinfo.json
    let file = std::fs::File::open(&zip_path)
        .map_err(|e| format!("Failed to open zip file: {}", e))?;
    
    let mut archive = ZipArchive::new(file)
        .map_err(|e| format!("Failed to read zip archive: {}", e))?;

    // Check if modinfo.json exists in the zip
    let mut found_modinfo = false;
    for i in 0..archive.len() {
        let file = archive.by_index(i)
            .map_err(|e| format!("Failed to read file from archive: {}", e))?;
        
        let name = file.name();
        if name == "modinfo.json" || name.ends_with("/modinfo.json") {
            found_modinfo = true;
            break;
        }
    }

    if !found_modinfo {
        // Try to find modinfo.json in subdirectories
        for i in 0..archive.len() {
            let file = archive.by_index(i)
                .map_err(|e| format!("Failed to read file from archive: {}", e))?;
            
            let name = file.name().to_lowercase();
            if name.contains("modinfo.json") {
                found_modinfo = true;
                break;
            }
        }
    }

    if !found_modinfo {
        eprintln!("[download_mod] WARNING: modinfo.json not found in zip, but continuing anyway");
    }

    Ok(zip_path.to_string_lossy().to_string())
}

