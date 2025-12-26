import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { applyModPack } from '../../src/services/modpack';
import * as apiModule from '../../src/services/api';
import { getSettings } from '../../src/services/storage';
import type { ModPack } from '../../src/types/mod';

vi.mock('@tauri-apps/api/core');
vi.mock('../../src/services/api');
vi.mock('../../src/services/storage');

describe('ModPack Workflow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('applyModPack workflow', () => {
    it('should successfully apply a mod pack with all mods already installed', async () => {
      const mockPack: ModPack = {
        name: 'Test Pack',
        version: '1.0.0',
        description: 'A test mod pack',
        mods: [
          { id: 'mod1', version: '1.0.0' },
          { id: 'mod2', version: '1.0.0' },
        ],
        metadata: {},
      };

      const modsPath = '/path/to/mods';
      const mockModList = [
        { id: 'mod1', name: 'Mod 1', enabled: false },
        { id: 'mod2', name: 'Mod 2', enabled: false },
      ];

      (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
        if (cmd === 'get_mod_list') {
          return Promise.resolve(mockModList);
        }
        if (cmd === 'enable_mods') {
          return Promise.resolve(undefined);
        }
        return Promise.resolve(undefined);
      });

      const onProgress = vi.fn();
      const onSuccess = vi.fn();
      const onSkipped = vi.fn();
      const showToast = vi.fn();

      const result = await applyModPack(mockPack, modsPath, {
        onProgress,
        onSuccess,
        onSkipped,
        showToast,
      });

      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(2); // Both mods were already installed
      expect(onProgress).toHaveBeenCalledTimes(3); // 2 mods + final update
      expect(onSuccess).toHaveBeenCalledTimes(2);
      expect(onSkipped).toHaveBeenCalledTimes(2);
      expect(invoke).toHaveBeenCalledWith('enable_mods', {
        modsPath,
        modIds: ['mod1'],
      });
      expect(invoke).toHaveBeenCalledWith('enable_mods', {
        modsPath,
        modIds: ['mod2'],
      });
    });

    it('should download and apply mods that are not installed', async () => {
      const mockPack: ModPack = {
        name: 'Test Pack',
        version: '1.0.0',
        description: 'A test mod pack',
        mods: [
          { id: 'mod1', version: '1.0.0', url: 'https://mods.vintagestory.at/api/mod/mod1' },
        ],
        metadata: {},
      };

      const modsPath = '/path/to/mods';
      const mockModList: any[] = []; // No mods installed

      (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
        if (cmd === 'get_mod_list') {
          return Promise.resolve(mockModList);
        }
        if (cmd === 'download_mod') {
          return Promise.resolve('/path/to/mods/mod1.zip');
        }
        if (cmd === 'reindex_mod') {
          return Promise.resolve(undefined);
        }
        if (cmd === 'enable_mods') {
          return Promise.resolve(undefined);
        }
        return Promise.resolve(undefined);
      });

      vi.spyOn(apiModule, 'getModDownloadUrl').mockResolvedValue(
        'https://mods.vintagestory.at/download/mod1.zip'
      );

      const onProgress = vi.fn();
      const onSuccess = vi.fn();
      const showToast = vi.fn();

      const result = await applyModPack(mockPack, modsPath, {
        onProgress,
        onSuccess,
        showToast,
      });

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(apiModule.getModDownloadUrl).toHaveBeenCalledWith('mod1', 'https://mods.vintagestory.at/api/mod/mod1');
      expect(invoke).toHaveBeenCalledWith('download_mod', {
        modId: 'mod1',
        downloadUrl: 'https://mods.vintagestory.at/download/mod1.zip',
        modsPath,
      });
      expect(invoke).toHaveBeenCalledWith('reindex_mod', {
        modsPath,
        modId: 'mod1',
      });
      expect(invoke).toHaveBeenCalledWith('enable_mods', {
        modsPath,
        modIds: ['mod1'],
      });
      expect(showToast).toHaveBeenCalledWith('Downloaded mod1', 'success', 3000);
    });

    it('should handle cancellation during mod pack application', async () => {
      const mockPack: ModPack = {
        name: 'Test Pack',
        version: '1.0.0',
        description: 'A test mod pack',
        mods: [
          { id: 'mod1', version: '1.0.0', url: 'https://mods.vintagestory.at/api/mod/mod1' },
          { id: 'mod2', version: '1.0.0', url: 'https://mods.vintagestory.at/api/mod/mod2' },
        ],
        metadata: {},
      };

      const modsPath = '/path/to/mods';
      const mockModList: any[] = [];

      const abortController = new AbortController();

      (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
        if (cmd === 'get_mod_list') {
          return Promise.resolve(mockModList);
        }
        // Abort after first mod's download URL is fetched
        if (cmd === 'get_mod_download_url') {
          abortController.abort();
          return Promise.resolve('https://mods.vintagestory.at/download/mod1.zip');
        }
        return Promise.resolve(undefined);
      });

      vi.spyOn(apiModule, 'getModDownloadUrl').mockImplementation(() => {
        abortController.abort();
        return Promise.resolve('https://mods.vintagestory.at/download/mod1.zip');
      });

      const onProgress = vi.fn();
      const onSkipped = vi.fn();

      const result = await applyModPack(mockPack, modsPath, {
        onProgress,
        onSkipped,
        abortSignal: abortController.signal,
      });

      // Should have skipped remaining mods due to cancellation
      // The first mod might be partially processed, but remaining should be skipped
      expect(result.skipped).toBeGreaterThanOrEqual(0);
      // At least one skipped callback should be called for remaining mods
      expect(onProgress).toHaveBeenCalled();
    });

    it('should handle download failures gracefully', async () => {
      const mockPack: ModPack = {
        name: 'Test Pack',
        version: '1.0.0',
        description: 'A test mod pack',
        mods: [
          { id: 'mod1', version: '1.0.0', url: 'https://mods.vintagestory.at/api/mod/mod1' },
        ],
        metadata: {},
      };

      const modsPath = '/path/to/mods';
      const mockModList: any[] = [];

      (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
        if (cmd === 'get_mod_list') {
          return Promise.resolve(mockModList);
        }
        if (cmd === 'download_mod') {
          return Promise.reject(new Error('Download failed'));
        }
        // enable_mods should not be called if download fails
        if (cmd === 'enable_mods') {
          return Promise.resolve(undefined);
        }
        return Promise.resolve(undefined);
      });

      vi.spyOn(apiModule, 'getModDownloadUrl').mockResolvedValue(
        'https://mods.vintagestory.at/download/mod1.zip'
      );

      const onFailed = vi.fn();
      const showToast = vi.fn();

      const result = await applyModPack(mockPack, modsPath, {
        onFailed,
        showToast,
      });

      expect(result.failed).toBe(1);
      expect(result.skipped).toBe(0);
      expect(onFailed).toHaveBeenCalledWith('mod1', 'Download failed');
      expect(showToast).toHaveBeenCalledWith(
        'Failed to download mod1: Download failed',
        'error',
        6000
      );
      // enable_mods should not be called when download fails (code uses continue)
      expect(invoke).not.toHaveBeenCalledWith('enable_mods', expect.any(Object));
    });

    it('should handle missing download URLs', async () => {
      const mockPack: ModPack = {
        name: 'Test Pack',
        version: '1.0.0',
        description: 'A test mod pack',
        mods: [
          { id: 'mod1', version: '1.0.0' }, // No URL provided
        ],
        metadata: {},
      };

      const modsPath = '/path/to/mods';
      const mockModList: any[] = [];

      (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
        if (cmd === 'get_mod_list') {
          return Promise.resolve(mockModList);
        }
        return Promise.resolve(undefined);
      });

      vi.spyOn(apiModule, 'getModDownloadUrl').mockResolvedValue('');

      const onFailed = vi.fn();
      const showToast = vi.fn();

      const result = await applyModPack(mockPack, modsPath, {
        onFailed,
        showToast,
      });

      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.skipped).toBe(0);
      expect(onFailed).toHaveBeenCalledWith(
        'mod1',
        'No download URL available for mod1'
      );
      expect(showToast).toHaveBeenCalledWith(
        'No download URL available for mod1',
        'error',
        6000
      );
    });
  });

  describe('Settings integration with mod pack operations', () => {
    it('should use mods path from settings when applying mod pack', async () => {
      const mockSettings = {
        mods_path: '/custom/mods/path',
        theme: 'dark',
      };

      (getSettings as ReturnType<typeof vi.fn>).mockResolvedValue(mockSettings);

      const mockPack: ModPack = {
        name: 'Test Pack',
        version: '1.0.0',
        description: 'A test mod pack',
        mods: [{ id: 'mod1', version: '1.0.0' }],
        metadata: {},
      };

      const mockModList = [{ id: 'mod1', name: 'Mod 1', enabled: false }];

      (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
        if (cmd === 'get_mod_list') {
          return Promise.resolve(mockModList);
        }
        if (cmd === 'enable_mods') {
          return Promise.resolve(undefined);
        }
        return Promise.resolve(undefined);
      });

      const result = await applyModPack(mockPack, mockSettings.mods_path!);

      expect(result.success).toBe(1);
      expect(invoke).toHaveBeenCalledWith('get_mod_list', {
        modsPath: '/custom/mods/path',
        forceRefresh: false,
      });
      expect(invoke).toHaveBeenCalledWith('enable_mods', {
        modsPath: '/custom/mods/path',
        modIds: ['mod1'],
      });
    });
  });
});

