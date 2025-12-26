import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Tauri APIs
global.window.__TAURI_INTERNALS__ = {
  invoke: vi.fn(),
};

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock @tauri-apps/plugin-dialog
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

