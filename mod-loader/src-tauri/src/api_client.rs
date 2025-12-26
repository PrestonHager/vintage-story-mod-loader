// API client for downloading mods directly
// Uses the VS Mod DB API: https://raw.githubusercontent.com/anegostudios/vsmoddb/refs/heads/master/README.md
// Endpoint: /api/mod/<modid> where modid can be numeric ID or modid string from modinfo.json
// Endpoint: /api/mods for searching mods with parameters: text, tagids[], gameversion, author, orderby, orderdirection
// Response format: JSON with statuscode property and mod.releases[0].mainfile containing the download URL
// API docs: http://mods.vintagestory.at/api

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize)]
struct ModApiResponse {
    #[serde(rename = "statuscode")]
    status_code: Option<u16>, // HTTP status code from API response
    #[serde(rename = "mod")]
    mod_data: Option<ModApiData>, // Optional because API may return error
}

#[derive(Debug, Deserialize)]
struct ModApiData {
    releases: Vec<ModRelease>,
}

#[derive(Debug, Deserialize)]
struct ModRelease {
    mainfile: String, // Full URI to download file - always respect full URIs returned by API
}

#[tauri::command]
pub async fn get_mod_download_url(mod_id: String, mod_url: Option<String>) -> Result<String, String> {
    use regex::Regex;
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    // Try to construct the API URL
    // API base URL: http://mods.vintagestory.at/api (per API docs)
    // Endpoint: /api/mod/<modid> where modid can be numeric ID or modid string
    let api_url = if let Some(url) = mod_url {
        // If it's already an API URL, use it (handle both http and https)
        if url.contains("/api/mod/") {
            // Ensure we use http:// as per API docs (though https may also work)
            url.replace("https://mods.vintagestory.at/api/mod/", "http://mods.vintagestory.at/api/mod/")
        } else if url.contains("/api/mods/") {
            // Old format - convert to new format
            let mod_id_from_url = url.split("/api/mods/").last().unwrap_or(&mod_id);
            format!("http://mods.vintagestory.at/api/mod/{}", mod_id_from_url)
        } else if url.contains("/show/mod/") {
            // Convert page URL to API URL
            let mod_id_from_url = url.split("/show/mod/").last().unwrap_or(&mod_id);
            format!("http://mods.vintagestory.at/api/mod/{}", mod_id_from_url)
        } else if url.contains("mods.vintagestory.at") {
            // Try to extract mod ID from URL or use provided mod_id
            format!("http://mods.vintagestory.at/api/mod/{}", mod_id)
        } else {
            format!("http://mods.vintagestory.at/api/mod/{}", mod_id)
        }
    } else {
        format!("http://mods.vintagestory.at/api/mod/{}", mod_id)
    };
    
    eprintln!("[get_mod_download_url] Fetching mod API: {}", api_url);
    
    // Try API endpoint first
    match client
        .get(&api_url)
        .header("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36")
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                match response.text().await {
                    Ok(text) => {
                        // Try to parse as JSON API response
                        // API returns JSON with statuscode property and mod data
                        match serde_json::from_str::<ModApiResponse>(&text) {
                            Ok(api_response) => {
                                // Check statuscode if present (API uses HTTP error codes)
                                if let Some(status) = api_response.status_code {
                                    if status >= 400 {
                                        eprintln!("[get_mod_download_url] API returned error statuscode: {}", status);
                                        // Continue to fallback
                                    }
                                }
                                
                                // Get the first (latest) release's mainfile URL
                                // API docs: "Always respect the full uris returned by the api"
                                if let Some(mod_data) = api_response.mod_data {
                                    if let Some(release) = mod_data.releases.first() {
                                        let download_url = release.mainfile.clone();
                                        eprintln!("[get_mod_download_url] Found download URL from API: {}", download_url);
                                        return Ok(download_url);
                                    } else {
                                        eprintln!("[get_mod_download_url] No releases found in API response");
                                    }
                                } else {
                                    eprintln!("[get_mod_download_url] No mod data in API response (may be error response)");
                                }
                            }
                            Err(e) => {
                                eprintln!("[get_mod_download_url] Failed to parse API JSON: {}", e);
                                eprintln!("[get_mod_download_url] Response text: {}", &text.chars().take(500).collect::<String>());
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("[get_mod_download_url] Failed to read API response: {}", e);
                    }
                }
            } else {
                eprintln!("[get_mod_download_url] API returned status: {}", response.status());
            }
        }
        Err(e) => {
            eprintln!("[get_mod_download_url] Failed to fetch API: {}", e);
        }
    }
    
    // Fallback: Try scraping the mod page HTML
    let page_url = format!("https://mods.vintagestory.at/show/mod/{}", mod_id);
    eprintln!("[get_mod_download_url] Falling back to scraping mod page: {}", page_url);
    
    match client
        .get(&page_url)
        .header("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36")
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                match response.text().await {
                    Ok(html) => {
                        // Pattern 1: Direct download link with number
                        let download_pattern = Regex::new(r#"/download/(\d+)/[^"'\s<>]+\.(zip|tar|tar\.gz)"#)
                            .map_err(|e| format!("Failed to create regex: {}", e))?;
                        
                        for cap in download_pattern.captures_iter(&html) {
                            if let Some(full_match) = cap.get(0) {
                                let path = full_match.as_str();
                                let download_url = if path.starts_with("http") {
                                    path.to_string()
                                } else if path.starts_with("/") {
                                    format!("https://mods.vintagestory.at{}", path)
                                } else {
                                    format!("https://mods.vintagestory.at/{}", path)
                                };
                                eprintln!("[get_mod_download_url] Found download URL from HTML: {}", download_url);
                                return Ok(download_url);
                            }
                        }
                        
                        // Pattern 2: href attribute with download link
                        let href_pattern = Regex::new(r#"href=["']([^"']*download[^"']*\.(zip|tar|tar\.gz))"#)
                            .map_err(|e| format!("Failed to create href regex: {}", e))?;
                        
                        for cap in href_pattern.captures_iter(&html) {
                            if let Some(url_match) = cap.get(1) {
                                let mut url = url_match.as_str().to_string();
                                if url.starts_with("/") {
                                    url = format!("https://mods.vintagestory.at{}", url);
                                } else if !url.starts_with("http") {
                                    url = format!("https://mods.vintagestory.at/{}", url);
                                }
                                if url.contains("/download/") {
                                    eprintln!("[get_mod_download_url] Found download URL from HTML (href): {}", url);
                                    return Ok(url);
                                }
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("[get_mod_download_url] Failed to read HTML: {}", e);
                    }
                }
            } else {
                eprintln!("[get_mod_download_url] Page returned status: {}", response.status());
            }
        }
        Err(e) => {
            eprintln!("[get_mod_download_url] Failed to fetch page: {}", e);
        }
    }
    
    Err(format!("Could not find download URL for {}", mod_id))
}

// Structures for mod search API response
#[derive(Debug, Serialize, Deserialize)]
pub struct ModSearchResult {
    #[serde(rename = "statuscode")]
    status_code: Option<u16>,
    pub mods: Vec<ModSearchItem>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModSearchItem {
    pub id: Option<u64>, // Numeric ID
    pub modid: Option<String>, // Mod ID string from modinfo.json
    pub name: Option<String>,
    pub description: Option<String>,
    pub author: Option<String>,
    pub thumbnail: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub releases: Option<Vec<ModRelease>>,
}

#[tauri::command]
pub async fn search_mods(query: Option<String>, page: Option<usize>) -> Result<ModSearchResult, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    // API endpoint: /api/mods
    // Parameters: text (search query), orderby, orderdirection
    let mut api_url = "http://mods.vintagestory.at/api/mods".to_string();
    let mut params = Vec::new();
    
    if let Some(q) = query {
        if !q.trim().is_empty() {
            params.push(format!("text={}", urlencoding::encode(&q)));
        }
    }
    
    // Add pagination if needed (API doesn't explicitly support page, but we can try)
    if let Some(p) = page {
        if p > 1 {
            // Note: API docs don't mention pagination, but we'll include it in case
            params.push(format!("page={}", p));
        }
    }
    
    if !params.is_empty() {
        api_url.push('?');
        api_url.push_str(&params.join("&"));
    }
    
    eprintln!("[search_mods] Searching mods: {}", api_url);
    
    match client
        .get(&api_url)
        .header("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36")
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                match response.text().await {
                    Ok(text) => {
                        // Try to parse as ModSearchResult
                        match serde_json::from_str::<ModSearchResult>(&text) {
                            Ok(result) => {
                                eprintln!("[search_mods] Found {} mods", result.mods.len());
                                return Ok(result);
                            }
                            Err(e) => {
                                eprintln!("[search_mods] Failed to parse search result: {}", e);
                                eprintln!("[search_mods] Response preview: {}", &text.chars().take(500).collect::<String>());
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("[search_mods] Failed to read response: {}", e);
                    }
                }
            } else {
                eprintln!("[search_mods] API returned status: {}", response.status());
            }
        }
        Err(e) => {
            eprintln!("[search_mods] Failed to fetch API: {}", e);
        }
    }
    
    // Return empty result on error
    Ok(ModSearchResult {
        status_code: Some(500),
        mods: vec![],
    })
}

#[tauri::command]
pub async fn download_mod(mod_id: String, download_url: String, mods_path: String) -> Result<String, String> {
    use zip::ZipArchive;
    
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

