// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api_client;
mod config;
mod game_detector;
mod mod_manager;
mod mod_pack;
mod mod_submission;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            mod_manager::get_mod_list,
            mod_manager::enable_mods,
            mod_manager::disable_mods,
            mod_manager::read_modinfo,
            mod_manager::list_config_files,
            mod_manager::read_config,
            mod_manager::write_config,
            game_detector::detect_vintage_story_path,
            game_detector::get_vintage_story_path,
            config::get_settings,
            config::save_settings,
            api_client::download_mod,
            mod_pack::create_mod_pack,
            mod_pack::export_mod_pack,
            mod_pack::import_mod_pack,
            mod_submission::submit_mod_pack,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

