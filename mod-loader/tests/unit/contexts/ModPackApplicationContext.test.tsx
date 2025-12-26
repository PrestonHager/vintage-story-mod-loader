import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test-utils';
import { ModPackApplicationProvider, useModPackApplication } from '../../../src/contexts/ModPackApplicationContext';
import { act } from '@testing-library/react';
import type { ModPack } from '../../../src/types/mod';

const TestComponent = () => {
  const {
    progress,
    startApplication,
    updateProgress,
    cancelApplication,
    minimizeProgressBar,
    closeProgressBar,
    reset,
    getAbortController,
  } = useModPackApplication();

  const mockPack: ModPack = {
    name: 'Test Pack',
    version: '1.0.0',
    description: 'Test',
    mods: [{ id: 'mod1', version: '1.0.0' }],
    metadata: {},
  };

  return (
    <div>
      <div data-testid="progress">{JSON.stringify(progress)}</div>
      <button onClick={() => {
        const abortController = new AbortController();
        startApplication(mockPack, abortController);
      }}>Start</button>
      <button onClick={() => updateProgress({ currentModIndex: 1 })}>Update</button>
      <button onClick={cancelApplication}>Cancel</button>
      <button onClick={minimizeProgressBar}>Minimize</button>
      <button onClick={closeProgressBar}>Close</button>
      <button onClick={reset}>Reset</button>
      <button onClick={() => {
        const controller = getAbortController();
        console.log('Controller:', controller);
      }}>Get Controller</button>
    </div>
  );
};

describe('ModPackApplicationContext', () => {
  describe('Context Provider', () => {
    it('should provide context to children', () => {
      render(
        <ModPackApplicationProvider>
          <TestComponent />
        </ModPackApplicationProvider>
      );

      expect(screen.getByTestId('progress')).toBeInTheDocument();
    });

    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useModPackApplication must be used within a ModPackApplicationProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('startApplication', () => {
    it('should initialize progress state', async () => {
      render(
        <ModPackApplicationProvider>
          <TestComponent />
        </ModPackApplicationProvider>
      );

      const startButton = screen.getByText('Start');
      act(() => {
        startButton.click();
      });

      await waitFor(() => {
        const progressElement = screen.getByTestId('progress');
        const progress = JSON.parse(progressElement.textContent || '{}');
        expect(progress.isRunning).toBe(true);
        expect(progress.modPack).toBeTruthy();
        expect(progress.totalMods).toBe(1);
      });
    });

    it('should store abort controller', async () => {
      render(
        <ModPackApplicationProvider>
          <TestComponent />
        </ModPackApplicationProvider>
      );

      const startButton = screen.getByText('Start');
      act(() => {
        startButton.click();
      });

      await waitFor(() => {
        const getControllerButton = screen.getByText('Get Controller');
        act(() => {
          getControllerButton.click();
        });
      });
    });
  });

  describe('updateProgress', () => {
    it('should update progress state', async () => {
      render(
        <ModPackApplicationProvider>
          <TestComponent />
        </ModPackApplicationProvider>
      );

      const startButton = screen.getByText('Start');
      act(() => {
        startButton.click();
      });

      await waitFor(() => {
        const updateButton = screen.getByText('Update');
        act(() => {
          updateButton.click();
        });
      });

      await waitFor(() => {
        const progressElement = screen.getByTestId('progress');
        const progress = JSON.parse(progressElement.textContent || '{}');
        expect(progress.currentModIndex).toBe(1);
      });
    });
  });

  describe('cancelApplication', () => {
    it('should abort controller and update state', async () => {
      render(
        <ModPackApplicationProvider>
          <TestComponent />
        </ModPackApplicationProvider>
      );

      const startButton = screen.getByText('Start');
      act(() => {
        startButton.click();
      });

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel');
        act(() => {
          cancelButton.click();
        });
      });

      await waitFor(() => {
        const progressElement = screen.getByTestId('progress');
        const progress = JSON.parse(progressElement.textContent || '{}');
        expect(progress.cancelled).toBe(true);
        expect(progress.isRunning).toBe(false);
      });
    });
  });

  describe('minimizeProgressBar', () => {
    it('should toggle minimized state', async () => {
      render(
        <ModPackApplicationProvider>
          <TestComponent />
        </ModPackApplicationProvider>
      );

      const startButton = screen.getByText('Start');
      act(() => {
        startButton.click();
      });

      await waitFor(() => {
        const minimizeButton = screen.getByText('Minimize');
        act(() => {
          minimizeButton.click();
        });
      });

      await waitFor(() => {
        const progressElement = screen.getByTestId('progress');
        const progress = JSON.parse(progressElement.textContent || '{}');
        expect(progress.minimized).toBe(true);
      });
    });
  });

  describe('closeProgressBar', () => {
    it('should set closed state', async () => {
      render(
        <ModPackApplicationProvider>
          <TestComponent />
        </ModPackApplicationProvider>
      );

      const startButton = screen.getByText('Start');
      act(() => {
        startButton.click();
      });

      await waitFor(() => {
        const closeButton = screen.getByText('Close');
        act(() => {
          closeButton.click();
        });
      });

      await waitFor(() => {
        const progressElement = screen.getByTestId('progress');
        const progress = JSON.parse(progressElement.textContent || '{}');
        expect(progress.closed).toBe(true);
      });
    });
  });

  describe('reset', () => {
    it('should reset progress state', async () => {
      render(
        <ModPackApplicationProvider>
          <TestComponent />
        </ModPackApplicationProvider>
      );

      const startButton = screen.getByText('Start');
      act(() => {
        startButton.click();
      });

      await waitFor(() => {
        const resetButton = screen.getByText('Reset');
        act(() => {
          resetButton.click();
        });
      });

      await waitFor(() => {
        const progressElement = screen.getByTestId('progress');
        const progress = JSON.parse(progressElement.textContent || '{}');
        expect(progress.isRunning).toBe(false);
        expect(progress.modPack).toBeNull();
        expect(progress.currentModIndex).toBe(0);
        expect(progress.totalMods).toBe(0);
      });
    });
  });
});

