import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { searchMods } from '../../src/services/api';
import { applyModPack } from '../../src/services/modpack';
import type { ModPack } from '../../src/types/mod';
import type { ModSearchApiResult } from '../../src/services/api';

vi.mock('@tauri-apps/api/core');

describe('API and ModPack Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Search and apply mod pack workflow', () => {
    it('should search for mods and create a mod pack from results', async () => {
      const mockSearchResult: ModSearchApiResult = {
        status_code: 200,
        mods: [
          {
            modid: 'test-mod-1',
            name: 'Test Mod 1',
            description: 'First test mod',
            author: 'Test Author',
            releases: [
              {
                mainfile: 'https://mods.vintagestory.at/download/test-mod-1.zip',
                version: '1.0.0',
              },
            ],
          },
          {
            modid: 'test-mod-2',
            name: 'Test Mod 2',
            description: 'Second test mod',
            author: 'Test Author',
            releases: [
              {
                mainfile: 'https://mods.vintagestory.at/download/test-mod-2.zip',
                version: '1.0.0',
              },
            ],
          },
        ],
      };

      (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(mockSearchResult);

      const searchResult = await searchMods('test');

      expect(searchResult.mods).toHaveLength(2);
      expect(searchResult.mods[0].id).toBe('test-mod-1');
      expect(searchResult.mods[0].download_url).toBe(
        'https://mods.vintagestory.at/download/test-mod-1.zip'
      );

      // Create a mod pack from search results
      const modPack: ModPack = {
        name: 'Test Pack from Search',
        version: '1.0.0',
        description: 'A pack created from search results',
        mods: searchResult.mods.map((mod) => ({
          id: mod.id,
          version: mod.version,
          url: mod.download_url,
        })),
        metadata: {},
      };

      expect(modPack.mods).toHaveLength(2);
      expect(modPack.mods[0].id).toBe('test-mod-1');
      expect(modPack.mods[0].url).toBe(
        'https://mods.vintagestory.at/download/test-mod-1.zip'
      );
    });

    it('should integrate search results with mod pack application', async () => {
      const mockSearchResult: ModSearchApiResult = {
        mods: [
          {
            modid: 'searched-mod',
            name: 'Searched Mod',
            releases: [
              {
                mainfile: 'https://mods.vintagestory.at/download/searched-mod.zip',
                version: '1.0.0',
              },
            ],
          },
        ],
      };

      (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
        if (cmd === 'search_mods') {
          return Promise.resolve(mockSearchResult);
        }
        if (cmd === 'get_mod_list') {
          return Promise.resolve([]);
        }
        if (cmd === 'get_mod_download_url') {
          return Promise.resolve('https://mods.vintagestory.at/download/searched-mod.zip');
        }
        if (cmd === 'download_mod') {
          return Promise.resolve('/path/to/mods/searched-mod.zip');
        }
        if (cmd === 'reindex_mod') {
          return Promise.resolve(undefined);
        }
        if (cmd === 'enable_mods') {
          return Promise.resolve(undefined);
        }
        return Promise.resolve(undefined);
      });

      // Search for mods
      const searchResult = await searchMods('searched');

      // Create mod pack from search results
      const modPack: ModPack = {
        name: 'Pack from Search',
        version: '1.0.0',
        description: 'Created from search',
        mods: searchResult.mods.map((mod) => ({
          id: mod.id,
          version: mod.version,
          url: mod.download_url,
        })),
        metadata: {},
      };

      // Apply the mod pack
      const modsPath = '/path/to/mods';
      const result = await applyModPack(modPack, modsPath);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(invoke).toHaveBeenCalledWith('download_mod', {
        modId: 'searched-mod',
        downloadUrl: 'https://mods.vintagestory.at/download/searched-mod.zip',
        modsPath,
      });
    });
  });

  describe('Download URL resolution integration', () => {
    it('should resolve download URLs through API and use them in mod pack application', async () => {
      const modsPath = '/path/to/mods';
      const modPack: ModPack = {
        name: 'Test Pack',
        version: '1.0.0',
        description: 'Test',
        mods: [
          {
            id: 'mod1',
            version: '1.0.0',
            url: 'https://mods.vintagestory.at/api/mod/mod1',
          },
        ],
        metadata: {},
      };

      (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
        if (cmd === 'get_mod_list') {
          return Promise.resolve([]);
        }
        if (cmd === 'get_mod_download_url') {
          return Promise.resolve('https://mods.vintagestory.at/download/mod1.zip');
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

      const result = await applyModPack(modPack, modsPath);

      expect(result.success).toBe(1);
      expect(invoke).toHaveBeenCalledWith('get_mod_download_url', {
        modId: 'mod1',
        modUrl: 'https://mods.vintagestory.at/api/mod/mod1',
      });
      expect(invoke).toHaveBeenCalledWith('download_mod', {
        modId: 'mod1',
        downloadUrl: 'https://mods.vintagestory.at/download/mod1.zip',
        modsPath,
      });
    });

    it('should handle direct download URLs without API resolution', async () => {
      const modsPath = '/path/to/mods';
      const modPack: ModPack = {
        name: 'Test Pack',
        version: '1.0.0',
        description: 'Test',
        mods: [
          {
            id: 'mod1',
            version: '1.0.0',
            url: 'https://mods.vintagestory.at/download/mod1.zip', // Direct download URL
          },
        ],
        metadata: {},
      };

      (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
        if (cmd === 'get_mod_list') {
          return Promise.resolve([]);
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

      const result = await applyModPack(modPack, modsPath);

      expect(result.success).toBe(1);
      // Should use direct URL without calling get_mod_download_url
      expect(invoke).toHaveBeenCalledWith('download_mod', {
        modId: 'mod1',
        downloadUrl: 'https://mods.vintagestory.at/download/mod1.zip',
        modsPath,
      });
    });
  });
});

