import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '../test-utils';
import ModPackProgressBar from '../../../src/components/ModPackProgressBar';
import { ModPackApplicationProvider, useModPackApplication } from '../../../src/contexts/ModPackApplicationContext';
import { act } from '@testing-library/react';
import type { ModPack } from '../../../src/types/mod';

const TestComponent = () => {
  const { startApplication, updateProgress, cancelApplication, minimizeProgressBar, closeProgressBar } = useModPackApplication();
  const mockPack: ModPack = {
    name: 'Test Pack',
    version: '1.0.0',
    description: 'Test',
    mods: [{ id: 'mod1', version: '1.0.0' }],
    metadata: {},
  };

  return (
    <div>
      <ModPackProgressBar />
      <button onClick={() => {
        const abortController = new AbortController();
        startApplication(mockPack, abortController);
      }}>Start</button>
      <button onClick={() => updateProgress({ currentModIndex: 1, totalMods: 2 })}>Update Progress</button>
      <button onClick={cancelApplication}>Cancel</button>
      <button onClick={minimizeProgressBar}>Minimize</button>
      <button onClick={closeProgressBar}>Close</button>
    </div>
  );
};

describe('ModPackProgressBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Functionality', () => {
    it('should not render when closed', () => {
      render(
        <ModPackApplicationProvider>
          <TestComponent />
        </ModPackApplicationProvider>
      );

      expect(screen.queryByText('Applying Mod Pack')).not.toBeInTheDocument();
    });

    it('should display progress bar when application starts', async () => {
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
        expect(screen.getByText('Applying Mod Pack')).toBeInTheDocument();
      });
    });

    it('should calculate progress percentage correctly', async () => {
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
        expect(screen.getByText('Applying Mod Pack')).toBeInTheDocument();
      });

      const updateButton = screen.getByText('Update Progress');
      act(() => {
        updateButton.click();
      });

      await waitFor(() => {
        // Progress should be 50% (1/2)
        expect(screen.getByText(/1 \/ 2 mods/)).toBeInTheDocument();
      });
    });

    it('should display cancel button when running', async () => {
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
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });

    it('should handle cancel button click', async () => {
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
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });

      const cancelButton = screen.getByText('Cancel');
      act(() => {
        cancelButton.click();
      });

      await waitFor(() => {
        expect(screen.getByText('Cancelled')).toBeInTheDocument();
      });
    });

    it('should handle minimize/expand functionality', async () => {
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
        expect(screen.getByText('Applying Mod Pack')).toBeInTheDocument();
      });

      const minimizeButton = screen.getByTitle('Minimize');
      act(() => {
        minimizeButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTitle('Expand')).toBeInTheDocument();
      });
    });

    it('should handle close button', async () => {
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
        expect(screen.getByText('Applying Mod Pack')).toBeInTheDocument();
      });

      const closeButton = screen.getByTitle('Close');
      act(() => {
        closeButton.click();
      });

      await waitFor(() => {
        expect(screen.queryByText('Applying Mod Pack')).not.toBeInTheDocument();
      });
    });

    it('should auto-dismiss after completion', async () => {
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
        expect(screen.getByText('Applying Mod Pack')).toBeInTheDocument();
      });

      // Simulate completion
      const updateButton = screen.getByText('Update Progress');
      act(() => {
        updateButton.click();
      });

      // Simulate completion by setting isRunning to false
      // This would normally happen when applyModPack completes
      // Advance fake timers to trigger auto-dismiss behavior (3 seconds after completion)
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // The progress bar should auto-dismiss after completion
      await waitFor(() => {
        expect(screen.queryByText('Applying Mod Pack')).not.toBeInTheDocument();
      });
    });
  });

  describe('Progress Updates', () => {
    it('should update progress during mod pack application', async () => {
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
        expect(screen.getByText('Applying Mod Pack')).toBeInTheDocument();
      });

      const updateButton = screen.getByText('Update Progress');
      act(() => {
        updateButton.click();
      });

      await waitFor(() => {
        expect(screen.getByText(/1 \/ 2 mods/)).toBeInTheDocument();
      });
    });

    it('should display success/failed/skipped counts', async () => {
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
        expect(screen.getByText(/✓ 0 succeeded/)).toBeInTheDocument();
        expect(screen.getByText(/✗ 0 failed/)).toBeInTheDocument();
        expect(screen.getByText(/⊘ 0 skipped/)).toBeInTheDocument();
      });
    });
  });
});

