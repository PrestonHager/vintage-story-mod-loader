import { invoke } from "@tauri-apps/api/tauri";

export interface Settings {
  vintage_story_path?: string;
  mods_path?: string;
  api_username?: string;
  api_password?: string;
  theme: string;
  default_mod_pack_location?: string;
}

export async function getSettings(): Promise<Settings> {
  return await invoke("get_settings");
}

export async function saveSettings(settings: Settings): Promise<void> {
  return await invoke("save_settings", { settings });
}

