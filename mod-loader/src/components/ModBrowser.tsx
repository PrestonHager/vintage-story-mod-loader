import { useState } from "react";
import { downloadMod } from "../services/api";
import { useToast } from "./Toast";

export default function ModBrowser() {
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const { showToast } = useToast();

  // Mod browser is disabled because the mod database API is not reliable
  // Users can download mods directly via mod packs or by providing direct download URLs

  return (
    <div>
      <div className="card">
        <h2>Browse Mods</h2>
        <p style={{ color: "var(--text-secondary, #666)", marginTop: "1rem" }}>
          The mod browser is currently disabled because the mod database API is not reliable.
        </p>
        <p style={{ color: "var(--text-secondary, #666)", marginTop: "0.5rem" }}>
          To download mods, please:
        </p>
        <ul style={{ color: "var(--text-secondary, #666)", marginTop: "0.5rem", paddingLeft: "1.5rem" }}>
          <li>Import a mod pack JSON file that contains mod download URLs</li>
          <li>Manually download mods from <a href="https://mods.vintagestory.at" target="_blank" rel="noopener noreferrer">mods.vintagestory.at</a> and place them in your mods folder</li>
        </ul>
        <p style={{ color: "var(--text-secondary, #666)", marginTop: "0.5rem" }}>
          Mod packs automatically construct download URLs in the format:<br />
          <code style={{ backgroundColor: "var(--bg-secondary, #f0f0f0)", padding: "2px 4px", borderRadius: "3px" }}>
            https://mods.vintagestory.at/download/&lt;modid&gt;_&lt;version&gt;.zip
          </code>
        </p>
      </div>
    </div>
  );
}

