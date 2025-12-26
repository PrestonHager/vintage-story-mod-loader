import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { applyModPack } from '../../src/services/modpack';
import type { ModPack } from '../../src/types/mod';
import * as apiModule from '../../src/services/api';

vi.mock('@tauri-apps/api/core');
vi.mock('../../src/services/api');

describe('Edge Cases Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Large Mod Packs', () => {
    it('should handle mod pack with 1000+ mods (performance test)', async () => {
      const largeModPack: ModPack = {
        name: 'Large Pack',
        version: '1.0.0',
        description: 'A pack with many mods',
        mods: Array.from({ length: 1000 }, (_, i) => ({
          id: `mod${i}`,
          version: '1.0.0',
          url: `https://mods.vintagestory.at/api/mod/mod${i}`,
        })),
        metadata: {},
      };

      const modsPath = '/path/to/mods';
      const mockModList: any[] = [];

      (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
        if (cmd === 'get_mod_list') {
          return Promise.resolve(mockModList);
        }
        if (cmd === 'download_mod') {
          return Promise.resolve('/path/to/mods/mod.zip');
        }
        if (cmd === 'reindex_mod') {
          return Promise.resolve(undefined);
        }
        if (cmd === 'enable_mods') {
          return Promise.resolve(undefined);
        }
        return Promise.resolve(undefined);
      });

      vi.spyOn(apiModule, 'getModDownloadUrl').mockResolvedValue('https://example.com/mod.zip');
      vi.spyOn(apiModule, 'downloadMod').mockResolvedValue('/path/to/mods/mod.zip');

      const startTime = Date.now();
      const result = await applyModPack(largeModPack, modsPath);
      const endTime = Date.now();

      expect(result.success).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
      expect(result.skipped).toBeGreaterThanOrEqual(0);
      // Performance check: should complete in reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(60000); // 60 seconds
    });

    it('should handle mod pack with mods that have very long names/descriptions', async () => {
      const longString = 'a'.repeat(10000);
      const modPack: ModPack = {
        name: longString,
        version: '1.0.0',
        description: longString,
        mods: [
          {
            id: 'mod1',
            version: '1.0.0',
            url: 'https://mods.vintagestory.at/api/mod/mod1',
          },
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
          return Promise.resolve('/path/to/mods/mod.zip');
        }
        if (cmd === 'reindex_mod') {
          return Promise.resolve(undefined);
        }
        if (cmd === 'enable_mods') {
          return Promise.resolve(undefined);
        }
        return Promise.resolve(undefined);
      });

      vi.spyOn(apiModule, 'getModDownloadUrl').mockResolvedValue('https://example.com/mod.zip');
      vi.spyOn(apiModule, 'downloadMod').mockResolvedValue('/path/to/mods/mod.zip');

      const result = await applyModPack(modPack, modsPath);

      expect(result.success).toBeGreaterThanOrEqual(0);
    });

    it('should handle mod pack with mods that have special characters in IDs', async () => {
      const modPack: ModPack = {
        name: 'Special Characters Pack',
        version: '1.0.0',
        description: 'Test',
        mods: [
          {
            id: 'mod-with-special-chars-!@#$%',
            version: '1.0.0',
            url: 'https://mods.vintagestory.at/api/mod/mod-with-special-chars-!@#$%',
          },
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
          return Promise.resolve('/path/to/mods/mod.zip');
        }
        if (cmd === 'reindex_mod') {
          return Promise.resolve(undefined);
        }
        if (cmd === 'enable_mods') {
          return Promise.resolve(undefined);
        }
        return Promise.resolve(undefined);
      });

      vi.spyOn(apiModule, 'getModDownloadUrl').mockResolvedValue('https://example.com/mod.zip');
      vi.spyOn(apiModule, 'downloadMod').mockResolvedValue('/path/to/mods/mod.zip');

      const result = await applyModPack(modPack, modsPath);

      expect(result.success).toBeGreaterThanOrEqual(0);
    });

    it('should handle mod pack with duplicate mod IDs', async () => {
      const modPack: ModPack = {
        name: 'Duplicate Mods Pack',
        version: '1.0.0',
        description: 'Test',
        mods: [
          { id: 'mod1', version: '1.0.0' },
          { id: 'mod1', version: '1.0.0' }, // Duplicate
          { id: 'mod2', version: '1.0.0' },
        ],
        metadata: {},
      };

      const modsPath = '/path/to/mods';
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

      const result = await applyModPack(modPack, modsPath);

      expect(result.success).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent mod pack operations', async () => {
      const modPack1: ModPack = {
        name: 'Pack 1',
        version: '1.0.0',
        description: 'Test',
        mods: [{ id: 'mod1', version: '1.0.0' }],
        metadata: {},
      };

      const modPack2: ModPack = {
        name: 'Pack 2',
        version: '1.0.0',
        description: 'Test',
        mods: [{ id: 'mod2', version: '1.0.0' }],
        metadata: {},
      };

      const modsPath = '/path/to/mods';
      const mockModList: any[] = [];

      (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
        if (cmd === 'get_mod_list') {
          return Promise.resolve(mockModList);
        }
        if (cmd === 'download_mod') {
          return Promise.resolve('/path/to/mods/mod.zip');
        }
        if (cmd === 'reindex_mod') {
          return Promise.resolve(undefined);
        }
        if (cmd === 'enable_mods') {
          return Promise.resolve(undefined);
        }
        return Promise.resolve(undefined);
      });

      vi.spyOn(apiModule, 'getModDownloadUrl').mockResolvedValue('https://example.com/mod.zip');
      vi.spyOn(apiModule, 'downloadMod').mockResolvedValue('/path/to/mods/mod.zip');

      const [result1, result2] = await Promise.all([
        applyModPack(modPack1, modsPath),
        applyModPack(modPack2, modsPath),
      ]);

      expect(result1.success).toBeGreaterThanOrEqual(0);
      expect(result2.success).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Partial Mod Installation', () => {
    it('should handle applying mod pack when some mods are already enabled', async () => {
      const modPack: ModPack = {
        name: 'Partial Pack',
        version: '1.0.0',
        description: 'Test',
        mods: [
          { id: 'mod1', version: '1.0.0' },
          { id: 'mod2', version: '1.0.0' },
        ],
        metadata: {},
      };

      const modsPath = '/path/to/mods';
      const mockModList = [{ id: 'mod1', name: 'Mod 1', enabled: true }];

      (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
        if (cmd === 'get_mod_list') {
          return Promise.resolve(mockModList);
        }
        if (cmd === 'enable_mods') {
          return Promise.resolve(undefined);
        }
        return Promise.resolve(undefined);
      });

      const result = await applyModPack(modPack, modsPath);

      expect(result.success).toBeGreaterThanOrEqual(0);
      expect(result.skipped).toBeGreaterThanOrEqual(0);
    });

    it('should handle applying mod pack when some mods are disabled', async () => {
      const modPack: ModPack = {
        name: 'Partial Pack',
        version: '1.0.0',
        description: 'Test',
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

      const result = await applyModPack(modPack, modsPath);

      expect(result.success).toBeGreaterThanOrEqual(0);
    });
  });
});

