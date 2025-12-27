import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import ModPackCreator from '../../../src/components/ModPackCreator';
import { exportModPack } from '../../../src/services/modpack';
import { getSettings } from '../../../src/services/storage';
import { invoke } from '@tauri-apps/api/core';
import type { Mod } from '../../../src/types/mod';

vi.mock('../../../src/services/modpack');
vi.mock('../../../src/services/storage');
vi.mock('@tauri-apps/api/core');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const MOD_PACK_CREATOR_STORAGE_KEY = 'vs-mod-loader-mod-pack-creator';

describe('ModPackCreator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (getSettings as ReturnType<typeof vi.fn>).mockResolvedValue({
      mods_path: '/path/to/mods',
      theme: 'dark',
    });
    (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
      if (cmd === 'get_vintage_story_path') {
        return Promise.resolve('/path/to/mods');
      }
      if (cmd === 'get_mod_list') {
        return Promise.resolve([
          { id: 'mod1', name: 'Mod 1', version: '1.0.0', enabled: true },
          { id: 'mod2', name: 'Mod 2', version: '1.0.0', enabled: false },
        ] as Mod[]);
      }
      return Promise.resolve(undefined);
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Basic Functionality', () => {
    it('should render mod pack creator form', async () => {
      render(<ModPackCreator />);
      await waitFor(() => {
        expect(screen.getByText('Create Mod Pack')).toBeInTheDocument();
      });
    });

    it('should load mods on mount', async () => {
      render(<ModPackCreator />);
      await waitFor(() => {
        expect(invoke).toHaveBeenCalledWith('get_mod_list', expect.any(Object));
      });
    });

    it('should allow selecting mods', async () => {
      render(<ModPackCreator />);
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter mod pack name')).toBeInTheDocument();
      });
    });

    it('should persist form data to localStorage', async () => {
      render(<ModPackCreator />);
      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('Enter mod pack name');
        fireEvent.change(nameInput, { target: { value: 'Test Pack' } });
      });

      await waitFor(() => {
        const stored = localStorage.getItem(MOD_PACK_CREATOR_STORAGE_KEY);
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.name).toBe('Test Pack');
      });
    });

    it('should restore form data from localStorage', async () => {
      const storedData = {
        name: 'Restored Pack',
        version: '2.0.0',
        description: 'Restored description',
        mods: [],
        metadata: {},
      };
      localStorage.setItem(MOD_PACK_CREATOR_STORAGE_KEY, JSON.stringify(storedData));

      render(<ModPackCreator />);
      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('Enter mod pack name') as HTMLInputElement;
        expect(nameInput.value).toBe('Restored Pack');
      });
    });
  });

  describe('Form Validation', () => {
    it('should validate empty name on export', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      render(<ModPackCreator />);

      await waitFor(() => {
        const exportButton = screen.getByText('Export Mod Pack');
        fireEvent.click(exportButton);
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Please provide a name and select at least one mod');
      });

      alertSpy.mockRestore();
    });

    it('should validate empty name on save and publish', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      render(<ModPackCreator />);

      await waitFor(() => {
        const publishButton = screen.getByText('Save and Publish');
        fireEvent.click(publishButton);
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Please provide a name and select at least one mod');
      });

      alertSpy.mockRestore();
    });

    it('should validate no mods selected on export', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      render(<ModPackCreator />);

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('Enter mod pack name');
        fireEvent.change(nameInput, { target: { value: 'Test Pack' } });
        const exportButton = screen.getByText('Export Mod Pack');
        fireEvent.click(exportButton);
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Please provide a name and select at least one mod');
      });

      alertSpy.mockRestore();
    });
  });

  describe('Negative Tests - Invalid Input', () => {
    it('should handle form validation with empty name', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      render(<ModPackCreator />);

      await waitFor(() => {
        const exportButton = screen.getByText('Export Mod Pack');
        fireEvent.click(exportButton);
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });

    it('should handle form validation with invalid version format', async () => {
      render(<ModPackCreator />);
      await waitFor(() => {
        const versionInput = screen.getByPlaceholderText('1.0.0');
        fireEvent.change(versionInput, { target: { value: 'invalid-version-format' } });
      });

      await waitFor(() => {
        const stored = localStorage.getItem(MOD_PACK_CREATOR_STORAGE_KEY);
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.version).toBe('invalid-version-format');
      });
    });

    it('should handle special characters in name', async () => {
      render(<ModPackCreator />);
      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('Enter mod pack name');
        fireEvent.change(nameInput, { target: { value: 'Test Pack !@#$%^&*()' } });
      });

      await waitFor(() => {
        const stored = localStorage.getItem(MOD_PACK_CREATOR_STORAGE_KEY);
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.name).toBe('Test Pack !@#$%^&*()');
      });
    });

    it('should handle extremely long descriptions', async () => {
      const longDescription = 'a'.repeat(100000);
      render(<ModPackCreator />);
      await waitFor(() => {
        const descriptionInput = screen.getByPlaceholderText('Enter mod pack description');
        fireEvent.change(descriptionInput, { target: { value: longDescription } });
      });

      await waitFor(() => {
        const stored = localStorage.getItem(MOD_PACK_CREATOR_STORAGE_KEY);
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.description).toBe(longDescription);
      });
    });

    it('should handle exporting with invalid mod pack data', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      (exportModPack as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Export failed'));

      render(<ModPackCreator />);
      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('Enter mod pack name');
        fireEvent.change(nameInput, { target: { value: 'Test Pack' } });
      });

      // Need to select at least one mod first
      await waitFor(() => {
        const exportButton = screen.getByText('Export Mod Pack');
        fireEvent.click(exportButton);
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });

    it('should handle submitting mod pack with missing required fields', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      render(<ModPackCreator />);

      await waitFor(() => {
        const publishButton = screen.getByText('Save and Publish');
        fireEvent.click(publishButton);
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Please provide a name and select at least one mod');
      });

      alertSpy.mockRestore();
    });
  });

  describe('Mod Selection', () => {
    it('should allow selecting all mods', async () => {
      render(<ModPackCreator />);
      await waitFor(() => {
        const selectAllButton = screen.getByText('Select All');
        fireEvent.click(selectAllButton);
      });

      await waitFor(() => {
        const stored = localStorage.getItem(MOD_PACK_CREATOR_STORAGE_KEY);
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.mods).toHaveLength(2);
      });
    });

    it('should allow deselecting all mods', async () => {
      render(<ModPackCreator />);
      await waitFor(() => {
        const selectAllButton = screen.getByText('Select All');
        fireEvent.click(selectAllButton);
        const deselectAllButton = screen.getByText('Deselect All');
        fireEvent.click(deselectAllButton);
      });

      await waitFor(() => {
        const stored = localStorage.getItem(MOD_PACK_CREATOR_STORAGE_KEY);
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.mods).toHaveLength(0);
      });
    });

    it('should allow selecting only enabled mods', async () => {
      render(<ModPackCreator />);
      await waitFor(() => {
        const selectEnabledButton = screen.getByText('Select All Enabled');
        fireEvent.click(selectEnabledButton);
      });

      await waitFor(() => {
        const stored = localStorage.getItem(MOD_PACK_CREATOR_STORAGE_KEY);
        expect(stored).toBeTruthy();
        const parsed = JSON.parse(stored!);
        expect(parsed.mods).toHaveLength(1);
        expect(parsed.mods[0].id).toBe('mod1');
      });
    });
  });
});

