# Vintage Story Mod Loader

A cross-platform mod loader and manager for Vintage Story that provides an intuitive interface for managing mods, creating mod packs, and integrating with the Vintage Story mod database.

## Features

- **Cross-platform**: Works on Windows, macOS, and Linux
- **Batch Mod Management**: Enable or disable multiple mods simultaneously
- **Mod Database Integration**: Browse and download mods directly from the database
- **Mod Pack System**: Create, import, export, and apply mod packs
- **Configuration Editor**: Edit mod config files with syntax highlighting
- **Auto-detection**: Automatically finds your Vintage Story installation
- **Submission Interface**: Submit mod packs to the mod database

## Installation

### Windows

Download the `.exe` installer from the [Releases](https://github.com/PrestonHager/vintage-story-mod-loader/releases) page.

### macOS

Download the `.dmg` file from the [Releases](https://github.com/PrestonHager/vintage-story-mod-loader/releases) page.

### Linux

Download the `.AppImage` or `.deb` package from the [Releases](https://github.com/PrestonHager/vintage-story-mod-loader/releases) page.

## Development

### Prerequisites

- Node.js 20+
- Rust (latest stable)
- npm or yarn

### Setup

#### Option 1: Using Nix (Recommended for NixOS/Linux)

```bash
# Clone the repository
git clone https://github.com/PrestonHager/vintage-story-mod-loader.git
cd vintage-story-mod-loader

# Enter the Nix development shell (provides Node.js, Rust, and all dependencies)
nix develop

# Install dependencies (must be in mod-loader directory)
cd mod-loader
npm install

# Run in development mode
npm run dev
```

#### Option 2: Manual Installation

```bash
# Clone the repository
git clone https://github.com/PrestonHager/vintage-story-mod-loader.git
cd vintage-story-mod-loader

# Install dependencies (must be in mod-loader directory)
cd mod-loader
npm install

# Run in development mode (starts both Vite dev server and Tauri app)
npm run tauri dev
```

**Note:** All npm commands must be run from the `mod-loader/` directory, not the project root.

**Note:** `npm run dev` only starts the Vite dev server. Use `npm run tauri dev` to run the full Tauri application.

### Building

```bash
cd mod-loader
npm run tauri build
```

### Testing

```bash
# Run Rust unit tests
cd mod-loader/src-tauri
cargo test

# Run E2E tests
cd mod-loader
npm run test:e2e
```

## Quick Start Guide

### Running in Development Mode

1. **Enter the development environment:**
   ```bash
   # If using Nix
   nix develop
   
   # Navigate to mod-loader directory
   cd mod-loader
   ```

2. **Install dependencies (if not already done):**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run tauri dev
   ```
   
   This will:
   - Start the Vite dev server on `http://localhost:1420`
   - Build and launch the Tauri application window
   - Enable hot module replacement for fast development

### Importing the Example Mod Pack

1. **Start the application** using `npm run tauri dev` (see above)

2. **Navigate to Import Pack:**
   - Click on "Import Pack" in the navigation bar
   - Or navigate directly to the Import Pack page

3. **Select the example mod pack:**
   - Click the "Import Mod Pack JSON" button
   - In the file dialog, navigate to the `examples/` folder in the project root
   - Select `example-mod-pack.json`
   - Click "Open"

4. **Review and apply:**
   - The mod pack details will be displayed
   - Review the mods included in the pack
   - Click "Apply Mod Pack" to download missing mods and enable all mods in the pack

**Note:** The example mod pack contains 50+ mods. Applying it will attempt to download any mods that aren't already installed. Make sure you have an internet connection and that the mod database is accessible.

## Documentation

See the [documentation website](https://PrestonHager.github.io/vintage-story-mod-loader/) for:

- User Guide
- Designer Guide
- FAQ

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the GNU General Public License v3.0 (GPL-3.0).

See the [LICENSE](LICENSE) file for the full license text.

## Acknowledgments

- Vintage Story community
- Tauri framework
- React community
