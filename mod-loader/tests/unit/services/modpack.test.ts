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

  describe('Negative Tests - Invalid Input', () => {
    // Note: These tests verify that the importModPack function handles invalid data gracefully
    // without crashing. Strict validation is intentionally deferred to:
    // 1. Backend (Rust) - validates file format and basic structure
    // 2. UI layer - validates before allowing user actions
    // 3. Application layer - validates before applying mod packs
    // This design allows the import function to be permissive and let higher layers
    // decide how to handle edge cases based on context.
    
    describe('importModPack', () => {
      it('should handle importing invalid JSON (malformed syntax)', async () => {
        (open as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/invalid.json');
        const error = new Error('Failed to parse JSON: Unexpected token');
        (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(error);

        await expect(importModPack()).rejects.toThrow('Failed to import mod pack');
      });

      it('should handle importing mod pack with missing required fields (name)', async () => {
        (open as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');
        const invalidPack = {
          version: '1.0.0',
          mods: [],
          metadata: {},
        };
        (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(invalidPack);

        const result = await importModPack();
        // Import is permissive - validation happens at UI/application layer
        // This allows backend to return partial data which UI can handle appropriately
        expect(result).toBeTruthy();
        expect(result?.version).toBe('1.0.0');
      });

      it('should handle importing mod pack with missing required fields (version)', async () => {
        (open as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');
        const invalidPack = {
          name: 'Test Pack',
          mods: [],
          metadata: {},
        };
        (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(invalidPack);

        const result = await importModPack();
        // Import is permissive - validation happens at UI/application layer
        expect(result).toBeTruthy();
        expect(result?.name).toBe('Test Pack');
      });

      it('should handle importing mod pack with missing required fields (mods)', async () => {
        (open as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');
        const invalidPack = {
          name: 'Test Pack',
          version: '1.0.0',
          metadata: {},
        };
        (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(invalidPack);

        const result = await importModPack();
        // Import normalizes missing mods array to empty array
        expect(result).toBeTruthy();
        expect(result?.mods).toEqual([]);
      });

      it('should handle importing mod pack with invalid version format', async () => {
        (open as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');
        const invalidPack: ModPack = {
          name: 'Test Pack',
          version: 'invalid-version-format',
          description: 'Test',
          mods: [],
          metadata: {},
        };
        (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(invalidPack);

        const result = await importModPack();
        // Import is permissive - semver validation happens at UI/application layer
        expect(result).toBeTruthy();
        expect(result?.version).toBe('invalid-version-format');
      });

      it('should handle importing mod pack with empty mods array', async () => {
        (open as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');
        const pack: ModPack = {
          name: 'Test Pack',
          version: '1.0.0',
          description: 'Test',
          mods: [],
          metadata: {},
        };
        (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(pack);

        const result = await importModPack();
        expect(result).toBeTruthy();
        expect(result?.mods).toHaveLength(0);
      });

      it('should handle importing mod pack with invalid mod IDs (empty strings)', async () => {
        (open as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');
        const pack: ModPack = {
          name: 'Test Pack',
          version: '1.0.0',
          description: 'Test',
          mods: [{ id: '', version: '1.0.0' }],
          metadata: {},
        };
        (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(pack);

        const result = await importModPack();
        // Import is permissive - mod ID validation happens when applying the pack
        expect(result).toBeTruthy();
        expect(result?.mods).toHaveLength(1);
        expect(result?.mods[0].id).toBe('');
      });

      it('should handle importing mod pack with invalid URLs (malformed)', async () => {
        (open as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');
        const pack: ModPack = {
          name: 'Test Pack',
          version: '1.0.0',
          description: 'Test',
          mods: [{ id: 'mod1', version: '1.0.0', url: 'not-a-valid-url' }],
          metadata: {},
        };
        (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(pack);

        const result = await importModPack();
        // Import is permissive - URL validation happens when downloading mods
        expect(result).toBeTruthy();
        expect(result?.mods[0].url).toBe('not-a-valid-url');
      });

      it('should handle importing mod pack with null values in required fields', async () => {
        (open as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');
        const invalidPack = {
          name: null,
          version: '1.0.0',
          mods: [],
          metadata: {},
        };
        (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(invalidPack);

        const result = await importModPack();
        // Import is permissive - null value handling happens at UI layer
        expect(result).toBeTruthy();
        expect(result?.name).toBeNull();
      });

      it('should handle importing mod pack with wrong data types', async () => {
        (open as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');
        const invalidPack = {
          name: 12345, // Should be string
          version: '1.0.0',
          mods: [],
          metadata: {},
        };
        (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(invalidPack);

        const result = await importModPack();
        // Import is permissive - type coercion/validation happens at UI layer
        expect(result).toBeTruthy();
        expect(result?.name).toBe(12345);
      });

      it('should handle importing mod pack with extremely long strings (DoS prevention)', async () => {
        (open as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');
        const longString = 'a'.repeat(1000000);
        const pack: ModPack = {
          name: longString,
          version: '1.0.0',
          description: 'Test',
          mods: [],
          metadata: {},
        };
        (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(pack);

        const result = await importModPack();
        
        // Verify that extremely long strings are handled without crashing
        expect(result).toBeTruthy();
        expect(result?.name).toBe(longString);
        // Note: Actual DoS prevention (e.g., truncation, rejection) would be implemented
        // at the backend level in the Rust code. This test verifies the frontend doesn't crash.
      });
    });

    describe('exportModPack', () => {
      it('should handle exporting with invalid mod pack data', async () => {
        const invalidPack = {
          name: '',
          version: '1.0.0',
          mods: [],
          metadata: {},
        } as ModPack;

        (save as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');
        (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

        await exportModPack(invalidPack);

        expect(invoke).toHaveBeenCalled();
      });
    });
  });
});

