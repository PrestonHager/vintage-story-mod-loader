import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import ModList from "./components/ModList";
import ModBrowser from "./components/ModBrowser";
import ModPackCreator from "./components/ModPackCreator";
import ModPackEditor from "./components/ModPackEditor";
import ModPackImporter from "./components/ModPackImporter";
import ConfigEditor from "./components/ConfigEditor";
import Settings from "./components/Settings";
import { getSettings } from "./services/storage";

function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Load theme from settings
    getSettings().then(settings => {
      const themeValue = (settings.theme === "dark" ? "dark" : "light") as "light" | "dark";
      setTheme(themeValue);
      document.documentElement.setAttribute("data-theme", themeValue);
    });

    // Listen for theme changes
    const interval = setInterval(() => {
      getSettings().then(settings => {
        const themeValue = (settings.theme === "dark" ? "dark" : "light") as "light" | "dark";
        if (themeValue !== theme) {
          setTheme(themeValue);
          document.documentElement.setAttribute("data-theme", themeValue);
        }
      });
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [theme]);

  return (
    <BrowserRouter>
      <div className={`app theme-${theme}`}>
        <nav className="navbar">
          <h1>Vintage Story Mod Loader</h1>
          <div className="nav-links">
            <Link to="/mods">Mods</Link>
            <Link to="/browser">Browse</Link>
            <Link to="/packs">Mod Packs</Link>
            <Link to="/packs/import">Import Pack</Link>
            <Link to="/config">Config</Link>
            <Link to="/settings">Settings</Link>
          </div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/mods" replace />} />
            <Route path="/mods" element={<ModList />} />
            <Route path="/browser" element={<ModBrowser />} />
            <Route path="/packs" element={<ModPackCreator />} />
            <Route path="/packs/edit" element={<ModPackEditor />} />
            <Route path="/packs/import" element={<ModPackImporter />} />
            <Route path="/config" element={<ConfigEditor />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

