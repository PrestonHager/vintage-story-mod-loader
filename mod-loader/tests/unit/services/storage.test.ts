import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { getSettings, saveSettings } from '../../../src/services/storage';
import type { Settings } from '../../../src/services/storage';

vi.mock('@tauri-apps/api/core');

describe('Storage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should retrieve settings from backend', async () => {
      const mockSettings: Settings = {
        vintage_story_path: '/path/to/vintagestory',
        mods_path: '/path/to/mods',
        theme: 'dark',
      };

      (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(mockSettings);

      const result = await getSettings();

      expect(invoke).toHaveBeenCalledWith('get_settings');
      expect(result).toEqual(mockSettings);
    });

    it('should handle empty settings', async () => {
      const mockSettings: Settings = {
        theme: 'light',
      };

      (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(mockSettings);

      const result = await getSettings();

      expect(result).toEqual(mockSettings);
    });
  });

  describe('saveSettings', () => {
    it('should save settings to backend', async () => {
      const settings: Settings = {
        vintage_story_path: '/path/to/vintagestory',
        mods_path: '/path/to/mods',
        theme: 'dark',
        api_username: 'testuser',
        api_password: 'testpass',
      };

      (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await saveSettings(settings);

      expect(invoke).toHaveBeenCalledWith('save_settings', { settings });
    });

    it('should save partial settings', async () => {
      const settings: Settings = {
        theme: 'light',
      };

      (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await saveSettings(settings);

      expect(invoke).toHaveBeenCalledWith('save_settings', { settings });
    });
  });
});

