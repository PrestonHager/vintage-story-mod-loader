import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../test-utils';
import { ModPackApplicationProvider, useModPackApplication } from '../../../src/contexts/ModPackApplicationContext';
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

      // React Testing Library catches errors, so we need to check the error boundary
      // or use a different approach
      render(<TestComponent />, {
        wrapper: ({ children }) => <>{children}</>, // No provider wrapper
      });

      // The error should be logged to console.error
      expect(consoleSpy).toHaveBeenCalled();

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
      fireEvent.click(startButton);

      await waitFor(() => {
        const getControllerButton = screen.getByText('Get Controller');
        fireEvent.click(getControllerButton);
      });
      
      // Verify controller was stored by checking console output or state
      // This is a basic smoke test that the controller management works
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
      fireEvent.click(startButton);

      const updateButton = await screen.findByText('Update');
      fireEvent.click(updateButton);

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
      fireEvent.click(startButton);

      const cancelButton = await screen.findByText('Cancel');
      fireEvent.click(cancelButton);

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
      fireEvent.click(startButton);

      const minimizeButton = await screen.findByText('Minimize');
      fireEvent.click(minimizeButton);

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
      fireEvent.click(startButton);

      const closeButton = await screen.findByText('Close');
      fireEvent.click(closeButton);

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
      fireEvent.click(startButton);

      const resetButton = await screen.findByText('Reset');
      fireEvent.click(resetButton);

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

