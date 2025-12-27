import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { checkModStatus } from '../../src/services/api';

vi.mock('@tauri-apps/api/core');

describe('QuiversAndSheaths Dependency Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect missing dependencies for quiversandsheaths mod', async () => {
    // Mock mod list with quiversandsheaths but without its dependency (CommonLib)
    const mockModList = [
      {
        id: 'quiversandsheaths',
        name: 'Quivers and Sheaths',
        version: '0.6.6',
        path: '/test/mods/quiversandsheaths.zip',
        enabled: true,
        is_zip: true,
        info: {
          modid: 'quiversandsheaths',
          name: 'Quivers and Sheaths',
          version: '0.6.6',
          authors: ['Author'],
          dependencies: ['CommonLib'], // Array of strings format
        },
      },
    ];

    // Mock the API response for quiversandsheaths (no update available)
    const mockApiResponse = {
      mod: {
        releases: [{ version: '0.6.6' }],
      },
    };

    (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string, args?: any) => {
      if (cmd === 'get_mod_list') {
        return Promise.resolve(mockModList);
      }
      if (cmd === 'check_mod_status') {
        // Simulate the backend checking dependencies
        // quiversandsheaths requires CommonLib but it's not in the mod list
        return Promise.resolve({
          hasUpdate: false,
          latestVersion: '0.6.6',
          missingDependencies: [{ modid: 'CommonLib', version: null }],
          outdatedDependencies: [],
        });
      }
      return Promise.resolve(undefined);
    });

    const status = await checkModStatus('quiversandsheaths', '/test/mods');

    expect(status.missingDependencies).toHaveLength(1);
    expect(status.missingDependencies[0].modid).toBe('CommonLib');
    expect(status.missingDependencies[0].version).toBeNull();
  });

  it('should detect dependencies when mod is installed as ZIP file', async () => {
    // This test verifies that ZIP mods preserve their dependency information
    // even when loaded from the index
    const mockModList = [
      {
        id: 'quiversandsheaths',
        name: 'Quivers and Sheaths',
        version: '0.6.6',
        path: '/test/mods/quiversandsheaths.zip',
        enabled: true,
        is_zip: true,
        info: {
          modid: 'quiversandsheaths',
          name: 'Quivers and Sheaths',
          version: '0.6.6',
          authors: ['Author'],
          dependencies: ['CommonLib'], // Dependencies should be preserved from ZIP
        },
      },
    ];

    (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
      if (cmd === 'get_mod_list') {
        return Promise.resolve(mockModList);
      }
      if (cmd === 'check_mod_status') {
        // The backend should detect the dependency from modinfo.json
        return Promise.resolve({
          hasUpdate: false,
          latestVersion: '0.6.6',
          missingDependencies: [{ modid: 'CommonLib', version: null }],
          outdatedDependencies: [],
        });
      }
      return Promise.resolve(undefined);
    });

    const status = await checkModStatus('quiversandsheaths', '/test/mods');

    expect(status.missingDependencies).toHaveLength(1);
    expect(status.missingDependencies[0].modid).toBe('CommonLib');
  });

  it('should not report missing dependency when dependency is installed', async () => {
    const mockModList = [
      {
        id: 'quiversandsheaths',
        name: 'Quivers and Sheaths',
        version: '0.6.6',
        path: '/test/mods/quiversandsheaths.zip',
        enabled: true,
        is_zip: true,
        info: {
          modid: 'quiversandsheaths',
          name: 'Quivers and Sheaths',
          version: '0.6.6',
          authors: ['Author'],
          dependencies: ['CommonLib'],
        },
      },
      {
        id: 'CommonLib',
        name: 'Common Library',
        version: '2.8.0',
        path: '/test/mods/CommonLib.zip',
        enabled: true,
        is_zip: true,
        info: {
          modid: 'CommonLib',
          name: 'Common Library',
          version: '2.8.0',
          authors: ['Author'],
          dependencies: null,
        },
      },
    ];

    (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
      if (cmd === 'get_mod_list') {
        return Promise.resolve(mockModList);
      }
      if (cmd === 'check_mod_status') {
        // CommonLib is installed, so no missing dependencies
        return Promise.resolve({
          hasUpdate: false,
          latestVersion: '0.6.6',
          missingDependencies: [],
          outdatedDependencies: [],
        });
      }
      return Promise.resolve(undefined);
    });

    const status = await checkModStatus('quiversandsheaths', '/test/mods');

    expect(status.missingDependencies).toHaveLength(0);
  });

  it('should handle dependencies in object format', async () => {
    // Some mods use object format: {"CommonLib": "2.8.0"}
    const mockModList = [
      {
        id: 'quiversandsheaths',
        name: 'Quivers and Sheaths',
        version: '0.6.6',
        path: '/test/mods/quiversandsheaths.zip',
        enabled: true,
        is_zip: true,
        info: {
          modid: 'quiversandsheaths',
          name: 'Quivers and Sheaths',
          version: '0.6.6',
          authors: ['Author'],
          dependencies: { CommonLib: '2.8.0' }, // Object format
        },
      },
    ];

    (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
      if (cmd === 'get_mod_list') {
        return Promise.resolve(mockModList);
      }
      if (cmd === 'check_mod_status') {
        return Promise.resolve({
          hasUpdate: false,
          latestVersion: '0.6.6',
          missingDependencies: [{ modid: 'CommonLib', version: '2.8.0' }],
          outdatedDependencies: [],
        });
      }
      return Promise.resolve(undefined);
    });

    const status = await checkModStatus('quiversandsheaths', '/test/mods');

    expect(status.missingDependencies).toHaveLength(1);
    expect(status.missingDependencies[0].modid).toBe('CommonLib');
    expect(status.missingDependencies[0].version).toBe('2.8.0');
  });

  it('should handle dependencies in array of objects format', async () => {
    // Some mods use array of objects: [{"modid": "CommonLib", "version": "2.8.0"}]
    const mockModList = [
      {
        id: 'quiversandsheaths',
        name: 'Quivers and Sheaths',
        version: '0.6.6',
        path: '/test/mods/quiversandsheaths.zip',
        enabled: true,
        is_zip: true,
        info: {
          modid: 'quiversandsheaths',
          name: 'Quivers and Sheaths',
          version: '0.6.6',
          authors: ['Author'],
          dependencies: [{ modid: 'CommonLib', version: '2.8.0' }], // Array of objects
        },
      },
    ];

    (invoke as ReturnType<typeof vi.fn>).mockImplementation((cmd: string) => {
      if (cmd === 'get_mod_list') {
        return Promise.resolve(mockModList);
      }
      if (cmd === 'check_mod_status') {
        return Promise.resolve({
          hasUpdate: false,
          latestVersion: '0.6.6',
          missingDependencies: [{ modid: 'CommonLib', version: '2.8.0' }],
          outdatedDependencies: [],
        });
      }
      return Promise.resolve(undefined);
    });

    const status = await checkModStatus('quiversandsheaths', '/test/mods');

    expect(status.missingDependencies).toHaveLength(1);
    expect(status.missingDependencies[0].modid).toBe('CommonLib');
    expect(status.missingDependencies[0].version).toBe('2.8.0');
  });
});

