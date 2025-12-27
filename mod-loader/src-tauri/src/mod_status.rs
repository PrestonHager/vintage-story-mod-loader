use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::command;

const MOD_DB_BASE_URL: &str = "http://mods.vintagestory.at/api";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModDependency {
    pub modid: String,
    pub version: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModStatus {
    #[serde(rename = "hasUpdate")]
    pub has_update: bool,
    #[serde(rename = "latestVersion")]
    pub latest_version: Option<String>,
    #[serde(rename = "missingDependencies")]
    pub missing_dependencies: Vec<ModDependency>,
    #[serde(rename = "outdatedDependencies")]
    pub outdated_dependencies: Vec<OutdatedDependency>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct OutdatedDependency {
    pub modid: String,
    pub required: String,
    pub installed: String,
}

#[derive(Debug, Deserialize)]
struct ModApiResponse {
    #[serde(rename = "mod")]
    mod_data: Option<ModApiData>,
}

#[derive(Debug, Deserialize)]
struct ModApiData {
    releases: Vec<ModRelease>,
}

#[derive(Debug, Deserialize)]
struct ModRelease {
    version: Option<String>,
}

// Base game mods that should be ignored in dependency checks
fn is_base_game_mod(modid: &str) -> bool {
    matches!(modid.to_lowercase().as_str(), "game" | "survival" | "creative")
}

// Parse dependencies from modinfo.json dependencies field
// Dependencies can be in various formats:
// - Array of strings: ["modid1", "modid2"]
// - Array of objects: [{"modid": "modid1", "version": "1.0.0"}]
// - Object: {"modid1": "1.0.0", "modid2": "2.0.0"}
fn parse_dependencies(deps: &serde_json::Value) -> Vec<ModDependency> {
    let mut result = Vec::new();

    match deps {
        serde_json::Value::Array(arr) => {
            for item in arr {
                match item {
                    serde_json::Value::String(modid) => {
                        // Filter out base game mods
                        if !is_base_game_mod(&modid) {
                            result.push(ModDependency {
                                modid: modid.clone(),
                                version: None,
                            });
                        }
                    }
                    serde_json::Value::Object(obj) => {
                        if let Some(modid_val) = obj.get("modid") {
                            if let Some(modid) = modid_val.as_str() {
                                // Filter out base game mods
                                if !is_base_game_mod(modid) {
                                    let version = obj
                                        .get("version")
                                        .and_then(|v| v.as_str())
                                        .map(|s| s.to_string());
                                    result.push(ModDependency {
                                        modid: modid.to_string(),
                                        version,
                                    });
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }
        }
        serde_json::Value::Object(obj) => {
            for (modid, version_val) in obj {
                // Filter out base game mods
                if !is_base_game_mod(modid) {
                    let version = version_val.as_str().map(|s| s.to_string());
                    result.push(ModDependency {
                        modid: modid.clone(),
                        version,
                    });
                }
            }
        }
        _ => {}
    }

    result
}

// Compare version strings (simple comparison, may need semver parsing for complex cases)
fn compare_versions(installed: &str, required: &str) -> bool {
    // Simple string comparison - for more complex versioning, use semver
    installed == required || installed >= required
}

async fn check_mod_status_internal(
    mod_id: String,
    _mods_path: String,
    mod_list: &[crate::mod_manager::Mod],
) -> Result<ModStatus, String> {
    let mod_info = mod_list
        .iter()
        .find(|m| m.id == mod_id)
        .ok_or_else(|| format!("Mod {} not found", mod_id))?
        .info
        .as_ref()
        .ok_or_else(|| format!("Mod {} has no modinfo", mod_id))?;

    let mut status = ModStatus {
        has_update: false,
        latest_version: None,
        missing_dependencies: Vec::new(),
        outdated_dependencies: Vec::new(),
    };

    // Check for updates
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let api_url = format!("{}/mod/{}", MOD_DB_BASE_URL, mod_id);
    if let Ok(response) = client
        .get(&api_url)
        .header(
            "User-Agent",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
        )
        .send()
        .await
    {
        if response.status().is_success() {
            if let Ok(text) = response.text().await {
                if let Ok(api_response) = serde_json::from_str::<ModApiResponse>(&text) {
                    if let Some(mod_data) = api_response.mod_data {
                        if let Some(latest_release) = mod_data.releases.first() {
                            if let Some(latest_version) = &latest_release.version {
                                status.latest_version = Some(latest_version.clone());
                                if latest_version != &mod_info.version {
                                    status.has_update = true;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Check dependencies
    if let Some(deps) = &mod_info.dependencies {
        let required_deps = parse_dependencies(deps);

        for dep in required_deps {
            let installed_mod = mod_list.iter().find(|m| m.id == dep.modid);

            match installed_mod {
                None => {
                    // Dependency is missing
                    status.missing_dependencies.push(dep);
                }
                Some(installed) => {
                    // Check version if required
                    if let Some(required_version) = &dep.version {
                        if let Some(installed_info) = &installed.info {
                            if !compare_versions(&installed_info.version, required_version) {
                                status.outdated_dependencies.push(OutdatedDependency {
                                    modid: dep.modid.clone(),
                                    required: required_version.clone(),
                                    installed: installed_info.version.clone(),
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(status)
}

#[command]
pub async fn check_mod_status(mod_id: String, mods_path: String) -> Result<ModStatus, String> {
    use crate::mod_manager;

    let mod_list = mod_manager::get_mod_list(mods_path.clone(), Some(false))
        .await
        .map_err(|e| format!("Failed to load mod list: {}", e))?;

    check_mod_status_internal(mod_id, mods_path, &mod_list).await
}

#[command]
pub async fn check_all_mods_status(
    mods_path: String,
) -> Result<HashMap<String, ModStatus>, String> {
    use crate::mod_manager;

    let mod_list = mod_manager::get_mod_list(mods_path.clone(), Some(false))
        .await
        .map_err(|e| format!("Failed to load mod list: {}", e))?;

    let mut results = HashMap::new();

    for mod_item in &mod_list {
        if mod_item.info.is_some() {
            match check_mod_status_internal(mod_item.id.clone(), mods_path.clone(), &mod_list).await
            {
                Ok(status) => {
                    results.insert(mod_item.id.clone(), status);
                }
                Err(e) => {
                    eprintln!("Failed to check status for {}: {}", mod_item.id, e);
                }
            }
        }
    }

    Ok(results)
}

#[command]
pub async fn install_dependencies(
    mod_id: String,
    mods_path: String,
) -> Result<Vec<String>, String> {
    let status = check_mod_status(mod_id.clone(), mods_path.clone()).await?;

    let mut installed = Vec::new();

    // Install missing dependencies
    for dep in status.missing_dependencies {
        eprintln!("Installing missing dependency: {}", dep.modid);
        match crate::api_client::get_mod_download_url(dep.modid.clone(), None).await {
            Ok(download_url) => {
                match crate::api_client::download_mod(
                    dep.modid.clone(),
                    download_url,
                    mods_path.clone(),
                )
                .await
                {
                    Ok(_) => {
                        // Reindex the newly installed mod
                        if let Err(e) =
                            crate::mod_manager::reindex_mod(mods_path.clone(), dep.modid.clone())
                                .await
                        {
                            eprintln!("Failed to reindex {}: {}", dep.modid, e);
                        }
                        installed.push(dep.modid.clone());
                    }
                    Err(e) => {
                        return Err(format!(
                            "Failed to download dependency {}: {}",
                            dep.modid, e
                        ));
                    }
                }
            }
            Err(e) => {
                return Err(format!(
                    "Failed to get download URL for dependency {}: {}",
                    dep.modid, e
                ));
            }
        }
    }

    // Update outdated dependencies
    for dep in status.outdated_dependencies {
        eprintln!(
            "Updating outdated dependency: {} ({} -> {})",
            dep.modid, dep.installed, dep.required
        );
        match crate::api_client::get_mod_download_url(dep.modid.clone(), None).await {
            Ok(download_url) => {
                match crate::api_client::download_mod(
                    dep.modid.clone(),
                    download_url,
                    mods_path.clone(),
                )
                .await
                {
                    Ok(_) => {
                        // Reindex the updated mod
                        if let Err(e) =
                            crate::mod_manager::reindex_mod(mods_path.clone(), dep.modid.clone())
                                .await
                        {
                            eprintln!("Failed to reindex {}: {}", dep.modid, e);
                        }
                        installed.push(dep.modid.clone());
                    }
                    Err(e) => {
                        return Err(format!("Failed to update dependency {}: {}", dep.modid, e));
                    }
                }
            }
            Err(e) => {
                return Err(format!(
                    "Failed to get download URL for dependency {}: {}",
                    dep.modid, e
                ));
            }
        }
    }

    Ok(installed)
}

#[command]
pub async fn update_mod(mod_id: String, mods_path: String) -> Result<(), String> {
    let status = check_mod_status(mod_id.clone(), mods_path.clone()).await?;

    if !status.has_update {
        return Err("Mod is already up to date".to_string());
    }

    let download_url = crate::api_client::get_mod_download_url(mod_id.clone(), None)
        .await
        .map_err(|e| format!("Failed to get download URL: {}", e))?;

    crate::api_client::download_mod(mod_id.clone(), download_url, mods_path.clone())
        .await
        .map_err(|e| format!("Failed to download mod: {}", e))?;

    // Reindex the updated mod
    crate::mod_manager::reindex_mod(mods_path, mod_id)
        .await
        .map_err(|e| format!("Failed to reindex mod: {}", e))?;

    Ok(())
}
