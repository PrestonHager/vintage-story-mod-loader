import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { searchMods } from '../../../src/services/api';
import type { ModSearchApiResult } from '../../../src/services/api';

vi.mock('@tauri-apps/api/core');

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchMods', () => {
    it('should convert API response to frontend format', async () => {
      const mockApiResult: ModSearchApiResult = {
        status_code: 200,
        mods: [
          {
            id: 1,
            modid: 'test-mod',
            name: 'Test Mod',
            description: 'A test mod',
            author: 'Test Author',
            thumbnail: 'https://example.com/thumb.png',
            category: 'Utility',
            tags: ['test', 'utility'],
            releases: [
              {
                mainfile: 'https://example.com/mod.zip',
                version: '1.0.0',
              },
            ],
          },
        ],
      };

      (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(mockApiResult);

      const result = await searchMods('test', 1);

      expect(result.mods).toHaveLength(1);
      expect(result.mods[0]).toEqual({
        id: 'test-mod',
        name: 'Test Mod',
        version: '1.0.0',
        description: 'A test mod',
        author: 'Test Author',
        download_url: 'https://example.com/mod.zip',
        thumbnail_url: 'https://example.com/thumb.png',
        category: 'Utility',
        tags: ['test', 'utility'],
      });
      expect(result.page).toBe(1);
      expect(result.per_page).toBe(20);
    });

    it('should handle mods without releases', async () => {
      const mockApiResult: ModSearchApiResult = {
        mods: [
          {
            modid: 'no-release-mod',
            name: 'No Release Mod',
          },
        ],
      };

      (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(mockApiResult);

      const result = await searchMods();

      expect(result.mods).toHaveLength(1);
      expect(result.mods[0].version).toBe('unknown');
      expect(result.mods[0].download_url).toBeUndefined();
    });

    it('should handle mods with numeric ID instead of modid', async () => {
      const mockApiResult: ModSearchApiResult = {
        mods: [
          {
            id: 123,
            name: 'Numeric ID Mod',
          },
        ],
      };

      (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(mockApiResult);

      const result = await searchMods();

      expect(result.mods[0].id).toBe('123');
    });

    it('should handle empty search results', async () => {
      const mockApiResult: ModSearchApiResult = {
        mods: [],
      };

      (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(mockApiResult);

      const result = await searchMods('nonexistent');

      expect(result.mods).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should use default page if not provided', async () => {
      const mockApiResult: ModSearchApiResult = {
        mods: [],
      };

      (invoke as ReturnType<typeof vi.fn>).mockResolvedValue(mockApiResult);

      const result = await searchMods();

      expect(result.page).toBe(1);
    });
  });

  describe('Negative Tests - Error Handling', () => {
    describe('getModDownloadUrl', () => {
      it('should handle invalid mod ID', async () => {
        const { getModDownloadUrl } = await import('../../../src/services/api');
        const error = new Error('Mod not found');
        (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(error);

        await expect(getModDownloadUrl('')).rejects.toThrow();
      });

      it('should handle non-existent mod', async () => {
        const { getModDownloadUrl } = await import('../../../src/services/api');
        const error = new Error('Mod not found: nonexistent-mod');
        (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(error);

        await expect(getModDownloadUrl('nonexistent-mod')).rejects.toThrow();
      });

      it('should handle API server error (500)', async () => {
        const { getModDownloadUrl } = await import('../../../src/services/api');
        const error = new Error('Internal Server Error');
        (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(error);

        await expect(getModDownloadUrl('mod1')).rejects.toThrow();
      });

      it('should handle API server error (503)', async () => {
        const { getModDownloadUrl } = await import('../../../src/services/api');
        const error = new Error('Service Unavailable');
        (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(error);

        await expect(getModDownloadUrl('mod1')).rejects.toThrow();
      });

      it('should handle network timeout', async () => {
        const { getModDownloadUrl } = await import('../../../src/services/api');
        const error = new Error('Network timeout');
        (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(error);

        await expect(getModDownloadUrl('mod1')).rejects.toThrow();
      });

      it('should handle malformed API response', async () => {
        const { getModDownloadUrl } = await import('../../../src/services/api');
        const error = new Error('Invalid JSON response');
        (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(error);

        await expect(getModDownloadUrl('mod1')).rejects.toThrow();
      });
    });

    describe('downloadMod', () => {
      it('should handle invalid URL', async () => {
        const { downloadMod } = await import('../../../src/services/api');
        const error = new Error('Invalid URL');
        (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(error);

        await expect(downloadMod('mod1', 'invalid-url', '/path/to/mods')).rejects.toThrow();
      });

      it('should handle network failure', async () => {
        const { downloadMod } = await import('../../../src/services/api');
        const error = new Error('Network error');
        (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(error);

        await expect(downloadMod('mod1', 'https://example.com/mod.zip', '/path/to/mods')).rejects.toThrow();
      });

      it('should handle disk full error', async () => {
        const { downloadMod } = await import('../../../src/services/api');
        const error = new Error('No space left on device');
        (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(error);

        await expect(downloadMod('mod1', 'https://example.com/mod.zip', '/path/to/mods')).rejects.toThrow();
      });

      it('should handle permission denied error', async () => {
        const { downloadMod } = await import('../../../src/services/api');
        const error = new Error('Permission denied');
        (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(error);

        await expect(downloadMod('mod1', 'https://example.com/mod.zip', '/path/to/mods')).rejects.toThrow();
      });

      it('should handle corrupted zip file', async () => {
        const { downloadMod } = await import('../../../src/services/api');
        const error = new Error('Corrupted zip file');
        (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(error);

        await expect(downloadMod('mod1', 'https://example.com/mod.zip', '/path/to/mods')).rejects.toThrow();
      });
    });

    describe('searchMods', () => {
      it('should handle invalid search parameters', async () => {
        const error = new Error('Invalid search parameters');
        (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(error);

        await expect(searchMods('', -1)).rejects.toThrow();
      });

      it('should handle API rate limiting', async () => {
        const error = new Error('Rate limit exceeded');
        (invoke as ReturnType<typeof vi.fn>).mockRejectedValue(error);

        await expect(searchMods('test')).rejects.toThrow();
      });
    });
  });
});

