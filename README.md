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

# Run in development mode
npm run dev
```

**Note:** All npm commands must be run from the `mod-loader/` directory, not the project root.

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
