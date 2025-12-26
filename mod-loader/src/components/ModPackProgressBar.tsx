import { useState, useEffect } from "react";
import { useModPackApplication } from "../contexts/ModPackApplicationContext";
import { useToast } from "./Toast";

export default function ModPackProgressBar() {
  const { progress, cancelApplication, minimizeProgressBar, closeProgressBar } = useModPackApplication();
  const { showToast } = useToast();
  const [autoDismissTimer, setAutoDismissTimer] = useState<number | null>(null);

  // Auto-dismiss after completion (1 second)
  useEffect(() => {
    if (!progress.isRunning && !progress.cancelled && !progress.closed) {
      const timer = setTimeout(() => {
        closeProgressBar();
      }, 1000);
      setAutoDismissTimer(timer);
      return () => {
        if (timer) clearTimeout(timer);
      };
    } else {
      if (autoDismissTimer) {
        clearTimeout(autoDismissTimer);
        setAutoDismissTimer(null);
      }
    }
  }, [progress.isRunning, progress.cancelled, progress.closed]);

  if (progress.closed || (!progress.isRunning && !progress.cancelled)) {
    return null;
  }

  const progressPercent = progress.totalMods > 0
    ? Math.round((progress.currentModIndex / progress.totalMods) * 100)
    : 0;

  const handleCancel = () => {
    cancelApplication();
    showToast("Mod pack application cancelled", "warning");
  };

  const handleMinimize = () => {
    minimizeProgressBar();
  };

  const handleClose = () => {
    closeProgressBar();
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: "20px",
        right: "20px",
        backgroundColor: "var(--card-bg, #fff)",
        border: "1px solid var(--border-color, #ddd)",
        borderRadius: "8px",
        padding: progress.minimized ? "8px 16px" : "16px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        zIndex: 9999,
        maxWidth: "600px",
        margin: "0 auto",
        transition: "all 0.3s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: progress.minimized ? "0" : "12px" }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: "16px" }}>
            {progress.cancelled ? "Cancelled" : progress.isRunning ? "Applying Mod Pack" : "Completed"}
          </h3>
          {progress.modPack && !progress.minimized && (
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--text-secondary, #666)" }}>
              {progress.modPack.name}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {progress.isRunning && !progress.cancelled && (
            <button
              onClick={handleCancel}
              style={{
                padding: "6px 12px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#c82333")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#dc3545")}
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleMinimize}
            style={{
              padding: "4px 8px",
              backgroundColor: "transparent",
              color: "var(--text-secondary, #666)",
              border: "1px solid var(--border-color, #ddd)",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              minWidth: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-secondary, #f0f0f0)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
            title={progress.minimized ? "Expand" : "Minimize"}
          >
            {progress.minimized ? "▲" : "▼"}
          </button>
          <button
            onClick={handleClose}
            style={{
              padding: "4px 8px",
              backgroundColor: "transparent",
              color: "var(--text-secondary, #666)",
              border: "1px solid var(--border-color, #ddd)",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "16px",
              minWidth: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-secondary, #f0f0f0)";
              e.currentTarget.style.color = "#dc3545";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--text-secondary, #666)";
            }}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {!progress.minimized && (
        <>
          <div style={{ marginBottom: "8px" }}>
            <div
              style={{
                width: "100%",
                height: "24px",
                backgroundColor: "var(--bg-secondary, #f0f0f0)",
                borderRadius: "12px",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  backgroundColor: progress.cancelled ? "#ffc107" : "#28a745",
                  transition: "width 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                {progressPercent > 10 ? `${progressPercent}%` : ""}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-secondary, #666)" }}>
            <div>
              {progress.currentModId && (
                <span>
                  Processing: <strong>{progress.currentModId}</strong>
                </span>
              )}
            </div>
            <div>
              {progress.currentModIndex} / {progress.totalMods} mods
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "12px" }}>
            <span style={{ color: "#28a745" }}>✓ {progress.success} succeeded</span>
            <span style={{ color: "#dc3545" }}>✗ {progress.failed} failed</span>
            <span style={{ color: "#6c757d" }}>⊘ {progress.skipped} skipped</span>
          </div>
        </>
      )}
    </div>
  );
}

