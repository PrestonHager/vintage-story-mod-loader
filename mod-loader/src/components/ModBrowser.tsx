import { useState, useEffect } from "react";
import { searchMods, downloadMod, getModDownloadUrl } from "../services/api";
import type { ModDatabaseMod } from "../types/mod";
import { useToast } from "./Toast";
import { invoke } from "@tauri-apps/api/core";

export default function ModBrowser() {
  const [mods, setMods] = useState<ModDatabaseMod[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const { showToast } = useToast();

  useEffect(() => {
    // Load mods on mount and when search/page changes
    if (searchQuery.trim() !== "" || page === 1) {
      loadMods();
    }
  }, [page]);

  async function loadMods() {
    try {
      setLoading(true);
      const result = await searchMods(searchQuery || undefined, page);
      setMods(result.mods);
    } catch (error) {
      console.error("Failed to load mods:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(`Failed to load mods: ${errorMessage}`, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(mod: ModDatabaseMod) {
    try {
      setDownloading(prev => new Set(prev).add(mod.id));
      
      // Get mods path from settings
      const { getSettings } = await import("../services/storage");
      const settings = await getSettings();
      const modsPath = settings.mods_path || await invoke<string>("get_vintage_story_path");
      
      // Get download URL if not already available
      let downloadUrl = mod.download_url;
      if (!downloadUrl) {
        // Try to get download URL from API
        try {
          downloadUrl = await getModDownloadUrl(mod.id, undefined);
        } catch (error) {
          console.warn(`Failed to get download URL for ${mod.id}:`, error);
          showToast(`No download URL available for ${mod.name}`, "warning");
          return;
        }
      }
      
      if (!downloadUrl) {
        showToast(`No download URL available for ${mod.name}`, "warning");
        return;
      }
      
      await downloadMod(mod.id, downloadUrl, modsPath);
      showToast(`Mod ${mod.name} installed successfully!`, "success");
    } catch (error) {
      console.error("Failed to download mod:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(`Failed to download mod: ${errorMessage}`, "error", 6000);
    } finally {
      setDownloading(prev => {
        const next = new Set(prev);
        next.delete(mod.id);
        return next;
      });
    }
  }

  return (
    <div>
      <div className="card">
        <h2>Browse Mods</h2>
        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <input
            type="text"
            placeholder="Search mods..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                loadMods();
              }
            }}
            style={{ flex: 1 }}
          />
          <button onClick={loadMods} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card">Loading mods...</div>
      ) : (
        <div>
          {mods.length === 0 ? (
            <div className="card">
              {searchQuery.trim() ? `No mods found for "${searchQuery}"` : "Enter a search query to find mods"}
            </div>
          ) : (
            mods.map((mod) => (
              <div key={mod.id} className="card">
                <div style={{ display: "flex", gap: "1rem" }}>
                  {mod.thumbnail_url && (
                    <img
                      src={mod.thumbnail_url}
                      alt={mod.name}
                      style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "4px" }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <h3>{mod.name}</h3>
                    <p style={{ color: "var(--text-secondary, #666)", fontSize: "0.9rem" }}>
                      Version: {mod.version} | Author: {mod.author || "Unknown"}
                    </p>
                    {mod.description && (
                      <p style={{ marginTop: "0.5rem" }}>{mod.description}</p>
                    )}
                    {mod.tags && mod.tags.length > 0 && (
                      <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        {mod.tags.map(tag => (
                          <span
                            key={tag}
                            className="tag"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDownload(mod)}
                    disabled={downloading.has(mod.id)}
                  >
                    {downloading.has(mod.id) ? "Downloading..." : "Download"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {mods.length > 0 && (
        <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </button>
          <span>Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={mods.length === 0}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

