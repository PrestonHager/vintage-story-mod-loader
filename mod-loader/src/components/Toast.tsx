import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info", duration: number = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: Toast = { id, message, type, duration };
    
    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxWidth: "400px",
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const getToastStyles = () => {
    const baseStyles: React.CSSProperties = {
      padding: "12px 16px",
      borderRadius: "4px",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      minWidth: "300px",
      maxWidth: "400px",
      animation: "slideIn 0.3s ease-out",
      wordWrap: "break-word",
    };

    const theme = document.documentElement.getAttribute("data-theme") || "light";
    const isDark = theme === "dark";

    switch (toast.type) {
      case "success":
        return {
          ...baseStyles,
          backgroundColor: isDark ? "#1e4620" : "#d4edda",
          color: isDark ? "#a3d9a3" : "#155724",
          borderLeft: `4px solid ${isDark ? "#4caf50" : "#28a745"}`,
        };
      case "error":
        return {
          ...baseStyles,
          backgroundColor: isDark ? "#4a1e1e" : "#f8d7da",
          color: isDark ? "#ff9a9a" : "#721c24",
          borderLeft: `4px solid ${isDark ? "#f44336" : "#dc3545"}`,
        };
      case "warning":
        return {
          ...baseStyles,
          backgroundColor: isDark ? "#4a3e1e" : "#fff3cd",
          color: isDark ? "#ffd54f" : "#856404",
          borderLeft: `4px solid ${isDark ? "#ff9800" : "#ffc107"}`,
        };
      case "info":
      default:
        return {
          ...baseStyles,
          backgroundColor: isDark ? "#1e3a4a" : "#d1ecf1",
          color: isDark ? "#81d4fa" : "#0c5460",
          borderLeft: `4px solid ${isDark ? "#2196f3" : "#17a2b8"}`,
        };
    }
  };

  return (
    <div style={getToastStyles()}>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          fontSize: "18px",
          padding: "0",
          width: "20px",
          height: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: 0.7,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
      >
        ×
      </button>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

