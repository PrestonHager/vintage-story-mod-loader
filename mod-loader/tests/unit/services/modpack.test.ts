import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { exportModPack, importModPack } from '../../../src/services/modpack';
import type { ModPack } from '../../../src/types/mod';

vi.mock('@tauri-apps/api/core');
vi.mock('@tauri-apps/plugin-dialog');

describe('ModPack Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportModPack', () => {
    it('should export mod pack when file path is provided', async () => {
      const mockPack: ModPack = {
        name: 'Test Pack',
        version: '1.0.0',
        description: 'A test mod pack',
        mods: [
          { id: 'mod1', version: '1.0.0' },
        ],
        metadata: {},
      };

      (save as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');
      (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await exportModPack(mockPack);

      expect(save).toHaveBeenCalledWith({
        filters: [{ name: 'Mod Pack', extensions: ['json'] }],
        defaultPath: 'Test_Pack.json',
      });
      expect(invoke).toHaveBeenCalledWith('export_mod_pack', {
        pack: mockPack,
        filePath: '/path/to/pack.json',
      });
    });

    it('should sanitize pack name in default path', async () => {
      const mockPack: ModPack = {
        name: 'Test Pack v1.0!',
        version: '1.0.0',
        description: 'A test mod pack',
        mods: [],
        metadata: {},
      };

      (save as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');
      (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await exportModPack(mockPack);

      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultPath: 'Test_Pack_v1_0_.json',
        })
      );
    });

    it('should not export if user cancels file dialog', async () => {
      const mockPack: ModPack = {
        name: 'Test Pack',
        version: '1.0.0',
        description: 'A test mod pack',
        mods: [],
        metadata: {},
      };

      (save as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await exportModPack(mockPack);

      expect(invoke).not.toHaveBeenCalled();
    });
  });

  describe('importModPack', () => {
    it('should import mod pack when file path is a string', async () => {
      const mockPack: ModPack = {
        name: 'Test Pack',
        version: '1.0.0',
        description: 'A test mod pack',
        mods: [],
        metadata: {},
      };

      (open as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');
      (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(mockPack);

      const result = await importModPack();

      expect(open).toHaveBeenCalledWith({
        filters: [{ name: 'Mod Pack', extensions: ['json'] }],
        multiple: false,
        title: 'Select Mod Pack JSON File',
      });
      expect(invoke).toHaveBeenCalledWith('import_mod_pack', {
        filePath: '/path/to/pack.json',
      });
      expect(result).toEqual(mockPack);
    });

    it('should import mod pack when file path is an array', async () => {
      const mockPack: ModPack = {
        name: 'Test Pack',
        version: '1.0.0',
        description: 'A test mod pack',
        mods: [],
        metadata: {},
      };

      (open as ReturnType<typeof vi.fn>).mockResolvedValue(['/path/to/pack.json']);
      (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(mockPack);

      const result = await importModPack();

      expect(invoke).toHaveBeenCalledWith('import_mod_pack', {
        filePath: '/path/to/pack.json',
      });
      expect(result).toEqual(mockPack);
    });

    it('should return null when user cancels file dialog', async () => {
      (open as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await importModPack();

      expect(result).toBeNull();
      expect(invoke).not.toHaveBeenCalled();
    });

    it('should throw error when import fails', async () => {
      const error = new Error('Failed to read file');
      (open as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');
      (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      await expect(importModPack()).rejects.toThrow('Failed to import mod pack: Failed to read file');
    });
  });
});

