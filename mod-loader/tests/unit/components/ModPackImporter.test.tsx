import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test-utils';
import ModPackImporter from '../../../src/components/ModPackImporter';
import { importModPack, applyModPack } from '../../../src/services/modpack';
import { getSettings } from '../../../src/services/storage';
import { invoke } from '@tauri-apps/api/core';
import type { ModPack } from '../../../src/types/mod';

vi.mock('../../../src/services/modpack');
vi.mock('../../../src/services/storage');
vi.mock('@tauri-apps/api/core');

describe('ModPackImporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
      mods_path: '/path/to/mods',
      theme: 'dark',
    });
  });

  describe('Basic Functionality', () => {
    it('should render import button', () => {
      render(<ModPackImporter />);
      expect(screen.getByText('Import Mod Pack JSON')).toBeInTheDocument();
    });

    it('should import mod pack from file', async () => {
      const mockPack: ModPack = {
        name: 'Test Pack',
        version: '1.0.0',
        description: 'A test mod pack',
        mods: [{ id: 'mod1', version: '1.0.0' }],
        metadata: {},
      };

      (importModPack as ReturnType<typeof vi.fn>).mockResolvedValue(mockPack);
      (invoke as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');

      render(<ModPackImporter />);
      const importButton = screen.getByText('Import Mod Pack JSON');
      importButton.click();

      await waitFor(() => {
        expect(screen.getByText('Test Pack')).toBeInTheDocument();
      });
    });

    it('should display mod pack details after import', async () => {
      const mockPack: ModPack = {
        name: 'Test Pack',
        version: '1.0.0',
        description: 'A test mod pack',
        mods: [{ id: 'mod1', version: '1.0.0' }],
        metadata: {},
      };

      (importModPack as ReturnType<typeof vi.fn>).mockResolvedValue(mockPack);
      (invoke as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');

      render(<ModPackImporter />);
      const importButton = screen.getByText('Import Mod Pack JSON');
      importButton.click();

      await waitFor(() => {
        expect(screen.getByText('Version: 1.0.0')).toBeInTheDocument();
        expect(screen.getByText('Description: A test mod pack')).toBeInTheDocument();
        expect(screen.getByText('Mods: 1')).toBeInTheDocument();
      });
    });

    it('should handle cancellation during import', async () => {
      (importModPack as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      render(<ModPackImporter />);
      const importButton = screen.getByText('Import Mod Pack JSON');
      importButton.click();

      await waitFor(() => {
        expect(screen.queryByText('Test Pack')).not.toBeInTheDocument();
      });
    });
  });

  describe('Negative Tests - Error Handling', () => {
    it('should handle corrupted JSON file', async () => {
      const error = new Error('Failed to parse JSON: Unexpected token');
      (importModPack as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      render(<ModPackImporter />);
      const importButton = screen.getByText('Import Mod Pack JSON');
      importButton.click();

      await waitFor(() => {
        expect(importModPack).toHaveBeenCalled();
      });
    });

    it('should handle non-JSON file', async () => {
      const error = new Error('Invalid file format');
      (importModPack as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      render(<ModPackImporter />);
      const importButton = screen.getByText('Import Mod Pack JSON');
      importButton.click();

      await waitFor(() => {
        expect(importModPack).toHaveBeenCalled();
      });
    });

    it('should handle empty file', async () => {
      const error = new Error('File is empty');
      (importModPack as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      render(<ModPackImporter />);
      const importButton = screen.getByText('Import Mod Pack JSON');
      importButton.click();

      await waitFor(() => {
        expect(importModPack).toHaveBeenCalled();
      });
    });

    it('should handle file with encoding issues', async () => {
      const error = new Error('Invalid UTF-8 encoding');
      (importModPack as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      render(<ModPackImporter />);
      const importButton = screen.getByText('Import Mod Pack JSON');
      importButton.click();

      await waitFor(() => {
        expect(importModPack).toHaveBeenCalled();
      });
    });

    it('should handle file path that does not exist', async () => {
      const error = new Error('File not found');
      (importModPack as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      render(<ModPackImporter />);
      const importButton = screen.getByText('Import Mod Pack JSON');
      importButton.click();

      await waitFor(() => {
        expect(importModPack).toHaveBeenCalled();
      });
    });

    it('should handle file with permission errors', async () => {
      const error = new Error('Permission denied');
      (importModPack as ReturnType<typeof vi.fn>).mockRejectedValue(error);

      render(<ModPackImporter />);
      const importButton = screen.getByText('Import Mod Pack JSON');
      importButton.click();

      await waitFor(() => {
        expect(importModPack).toHaveBeenCalled();
      });
    });

    it('should handle error during mod pack application', async () => {
      const mockPack: ModPack = {
        name: 'Test Pack',
        version: '1.0.0',
        description: 'A test mod pack',
        mods: [{ id: 'mod1', version: '1.0.0' }],
        metadata: {},
      };

      (importModPack as ReturnType<typeof vi.fn>).mockResolvedValue(mockPack);
      (invoke as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');
      (applyModPack as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Failed to apply'));

      render(<ModPackImporter />);
      const importButton = screen.getByText('Import Mod Pack JSON');
      importButton.click();

      await waitFor(() => {
        expect(screen.getByText('Apply Mod Pack')).toBeInTheDocument();
      });

      const applyButton = screen.getByText('Apply Mod Pack');
      applyButton.click();

      await waitFor(() => {
        expect(applyModPack).toHaveBeenCalled();
      });
    });

    it('should handle missing mods during application', async () => {
      const mockPack: ModPack = {
        name: 'Test Pack',
        version: '1.0.0',
        description: 'A test mod pack',
        mods: [{ id: 'nonexistent-mod', version: '1.0.0' }],
        metadata: {},
      };

      (importModPack as ReturnType<typeof vi.fn>).mockResolvedValue(mockPack);
      (invoke as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');
      (applyModPack as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: 0,
        failed: 1,
        skipped: 0,
      });

      render(<ModPackImporter />);
      const importButton = screen.getByText('Import Mod Pack JSON');
      importButton.click();

      await waitFor(() => {
        expect(screen.getByText('Apply Mod Pack')).toBeInTheDocument();
      });

      const applyButton = screen.getByText('Apply Mod Pack');
      applyButton.click();

      await waitFor(() => {
        expect(applyModPack).toHaveBeenCalled();
      });
    });
  });

  describe('Cancellation Handling', () => {
    it('should handle cancellation during mod pack application', async () => {
      const mockPack: ModPack = {
        name: 'Test Pack',
        version: '1.0.0',
        description: 'A test mod pack',
        mods: [{ id: 'mod1', version: '1.0.0' }],
        metadata: {},
      };

      (importModPack as ReturnType<typeof vi.fn>).mockResolvedValue(mockPack);
      (invoke as ReturnType<typeof vi.fn>).mockResolvedValue('/path/to/pack.json');
      (applyModPack as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: 0,
        failed: 0,
        skipped: 1,
      });

      render(<ModPackImporter />);
      const importButton = screen.getByText('Import Mod Pack JSON');
      importButton.click();

      await waitFor(() => {
        expect(screen.getByText('Apply Mod Pack')).toBeInTheDocument();
      });

      const applyButton = screen.getByText('Apply Mod Pack');
      applyButton.click();

      await waitFor(() => {
        expect(applyModPack).toHaveBeenCalled();
      });
    });
  });
});

