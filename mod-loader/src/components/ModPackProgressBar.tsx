import { useModPackApplication } from "../contexts/ModPackApplicationContext";
import { useToast } from "./Toast";

export default function ModPackProgressBar() {
  const { progress, cancelApplication } = useModPackApplication();
  const { showToast } = useToast();

  if (!progress.isRunning && !progress.cancelled) {
    return null;
  }

  const progressPercent = progress.totalMods > 0
    ? Math.round((progress.currentModIndex / progress.totalMods) * 100)
    : 0;

  const handleCancel = () => {
    cancelApplication();
    showToast("Mod pack application cancelled", "warning");
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
        padding: "16px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        zIndex: 9999,
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "16px" }}>
            {progress.cancelled ? "Cancelling..." : "Applying Mod Pack"}
          </h3>
          {progress.modPack && (
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--text-secondary, #666)" }}>
              {progress.modPack.name}
            </p>
          )}
        </div>
        {!progress.cancelled && (
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
      </div>

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
    </div>
  );
}

