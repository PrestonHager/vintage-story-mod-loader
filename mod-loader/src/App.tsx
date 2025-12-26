import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import ModList from "./components/ModList";
import ModBrowser from "./components/ModBrowser";
import ModPackCreator from "./components/ModPackCreator";
import ModPackEditor from "./components/ModPackEditor";
import ModPackImporter from "./components/ModPackImporter";
import ConfigEditor from "./components/ConfigEditor";
import Settings from "./components/Settings";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
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

