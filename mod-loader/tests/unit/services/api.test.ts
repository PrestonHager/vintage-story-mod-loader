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
});

