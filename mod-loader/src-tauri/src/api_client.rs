// API client for downloading mods directly
// The mod database API is not reliable, so we scrape mod pages to get download URLs
// Format: https://mods.vintagestory.at/download/<number>/<name>_<version>.zip

#[tauri::command]
pub async fn get_mod_download_url(mod_id: String, mod_url: Option<String>) -> Result<String, String> {
    use regex::Regex;
    
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    // Try to construct the mod page URL
    let page_url = if let Some(url) = mod_url {
        // If it's an API URL, convert to page URL
        if url.contains("/api/mods/") {
            let mod_id_from_url = url.split("/api/mods/").last().unwrap_or(&mod_id);
            format!("https://mods.vintagestory.at/show/mod/{}", mod_id_from_url)
        } else if url.contains("/show/mod/") {
            url
        } else if url.contains("mods.vintagestory.at") {
            url
        } else {
            format!("https://mods.vintagestory.at/show/mod/{}", mod_id)
        }
    } else {
        format!("https://mods.vintagestory.at/show/mod/{}", mod_id)
    };
    
    eprintln!("[get_mod_download_url] Fetching mod page: {}", page_url);
    
    let response = client
        .get(&page_url)
        .header("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch mod page: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("Failed to fetch mod page: {}", response.status()));
    }
    
    let html = response.text().await
        .map_err(|e| format!("Failed to read mod page: {}", e))?;
    
    // Look for download links in the HTML
    // Pattern: /download/<number>/<filename>
    // Try multiple patterns to catch different HTML structures
    
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
            eprintln!("[get_mod_download_url] Found download URL: {}", download_url);
            return Ok(download_url);
        }
    }
    
    // Pattern 2: href attribute with download link
    let href_pattern = Regex::new(r#"href=["']([^"']*download[^"']*\.(zip|tar|tar\.gz))"#)
        .map_err(|e| format!("Failed to create href regex: {}", e))?;
    
    for cap in href_pattern.captures_iter(&html) {
        if let Some(url_match) = cap.get(1) {
            let mut url = url_match.as_str().to_string();
            // Make absolute if relative
            if url.starts_with("/") {
                url = format!("https://mods.vintagestory.at{}", url);
            } else if !url.starts_with("http") {
                url = format!("https://mods.vintagestory.at/{}", url);
            }
            // Only return if it's a download URL
            if url.contains("/download/") {
                eprintln!("[get_mod_download_url] Found download URL (href): {}", url);
                return Ok(url);
            }
        }
    }
    
    // Pattern 3: Look for download button or link text
    let button_pattern = Regex::new(r#"(?:download|Download)[^"']*href=["']([^"']+)"#)
        .map_err(|e| format!("Failed to create button regex: {}", e))?;
    
    for cap in button_pattern.captures_iter(&html) {
        if let Some(url_match) = cap.get(1) {
            let mut url = url_match.as_str().to_string();
            if url.contains("/download/") && (url.ends_with(".zip") || url.ends_with(".tar") || url.ends_with(".tar.gz")) {
                if url.starts_with("/") {
                    url = format!("https://mods.vintagestory.at{}", url);
                } else if !url.starts_with("http") {
                    url = format!("https://mods.vintagestory.at/{}", url);
                }
                eprintln!("[get_mod_download_url] Found download URL (button): {}", url);
                return Ok(url);
            }
        }
    }
    
    Err(format!("Could not find download URL on mod page for {}", mod_id))
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

