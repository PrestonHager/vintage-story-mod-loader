import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '../test-utils';
import { ToastProvider, useToast } from '../../../src/components/Toast';
import { act } from '@testing-library/react';

const TestComponent = () => {
  const { showToast } = useToast();
  return (
    <div>
      <button onClick={() => showToast('Success message', 'success')}>Show Success</button>
      <button onClick={() => showToast('Error message', 'error')}>Show Error</button>
      <button onClick={() => showToast('Warning message', 'warning')}>Show Warning</button>
      <button onClick={() => showToast('Info message', 'info')}>Show Info</button>
      <button onClick={() => showToast('Custom duration', 'info', 1000)}>Show Custom Duration</button>
    </div>
  );
};

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Functionality', () => {
    it('should display success toast', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const button = screen.getByText('Show Success');
      act(() => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByText('Success message')).toBeInTheDocument();
      });
    });

    it('should display error toast', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const button = screen.getByText('Show Error');
      act(() => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByText('Error message')).toBeInTheDocument();
      });
    });

    it('should display warning toast', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const button = screen.getByText('Show Warning');
      act(() => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByText('Warning message')).toBeInTheDocument();
      });
    });

    it('should display info toast', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const button = screen.getByText('Show Info');
      act(() => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByText('Info message')).toBeInTheDocument();
      });
    });

    it('should auto-dismiss after duration', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const button = screen.getByText('Show Custom Duration');
      act(() => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByText('Custom duration')).toBeInTheDocument();
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.queryByText('Custom duration')).not.toBeInTheDocument();
      });
    });

    it('should allow manual close', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const button = screen.getByText('Show Success');
      act(() => {
        button.click();
      });

      await waitFor(() => {
        expect(screen.getByText('Success message')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('×');
      act(() => {
        closeButton.click();
      });

      await waitFor(() => {
        expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      });
    });

    it('should handle multiple toasts stacking', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      act(() => {
        screen.getByText('Show Success').click();
        screen.getByText('Show Error').click();
        screen.getByText('Show Warning').click();
      });

      await waitFor(() => {
        expect(screen.getByText('Success message')).toBeInTheDocument();
        expect(screen.getByText('Error message')).toBeInTheDocument();
        expect(screen.getByText('Warning message')).toBeInTheDocument();
      });
    });
  });

  describe('Toast Queue Management', () => {
    it('should remove toast when closed', async () => {
      // Use real timers for this test to avoid timing issues
      vi.useRealTimers();
      
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      act(() => {
        screen.getByText('Show Success').click();
      });

      await waitFor(() => {
        expect(screen.getByText('Success message')).toBeInTheDocument();
      });

      // Find all close buttons (×) and click the first one
      const closeButtons = screen.getAllByText('×');
      expect(closeButtons.length).toBeGreaterThan(0);
      
      fireEvent.click(closeButtons[0]);

      // Wait for the toast to be removed
      await waitFor(() => {
        expect(screen.queryByText('Success message')).not.toBeInTheDocument();
      }, { timeout: 1000 });
      
      // Restore fake timers
      vi.useFakeTimers();
    });

    it('should handle multiple toasts with different durations', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      act(() => {
        screen.getByText('Show Custom Duration').click();
        screen.getByText('Show Success').click();
      });

      await waitFor(() => {
        expect(screen.getByText('Custom duration')).toBeInTheDocument();
        expect(screen.getByText('Success message')).toBeInTheDocument();
      });

      // Advance timers to trigger auto-dismissal
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Wait for React to process the state update
      await act(async () => {
        // Flush promises
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(screen.queryByText('Custom duration')).not.toBeInTheDocument();
        expect(screen.getByText('Success message')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });
});

