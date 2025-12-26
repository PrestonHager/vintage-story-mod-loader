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

### NixOS / Nix

#### Option 1: Using the Overlay (Recommended)

Add the overlay to your Nix configuration:

**For NixOS (`/etc/nixos/configuration.nix` or `~/.config/nixpkgs/config.nix`):**

```nix
{
  nixpkgs.overlays = [
    (final: prev: (import (builtins.fetchTarball {
      url = "https://github.com/PrestonHager/vintage-story-mod-loader/archive/main.tar.gz";
      sha256 = "0000000000000000000000000000000000000000000000000000"; # Update with actual hash
    }) + "/overlay.nix") { src = builtins.fetchTarball {
      url = "https://github.com/PrestonHager/vintage-story-mod-loader/archive/main.tar.gz";
      sha256 = "0000000000000000000000000000000000000000000000000000";
    }; } final prev)
  ];
}
```

Or if you have the repository cloned locally:

```nix
{
  nixpkgs.overlays = [
    (final: prev: (import /path/to/vintage-story-mod-loader/overlay.nix {
      src = /path/to/vintage-story-mod-loader;
    }) final prev)
  ];
}
```

**For Home Manager (`~/.config/home-manager/home.nix`):**

```nix
let
  modLoaderSrc = builtins.fetchTarball {
    url = "https://github.com/PrestonHager/vintage-story-mod-loader/archive/main.tar.gz";
    sha256 = "0000000000000000000000000000000000000000000000000000"; # Update with actual hash
  };
in
{
  nixpkgs.overlays = [
    (final: prev: (import (modLoaderSrc + "/overlay.nix") { src = modLoaderSrc; }) final prev)
  ];

  home.packages = with pkgs; [
    vintage-story-mod-loader
  ];
}
```

**For NixOS system packages (`/etc/nixos/configuration.nix`):**

```nix
let
  modLoaderSrc = builtins.fetchTarball {
    url = "https://github.com/PrestonHager/vintage-story-mod-loader/archive/main.tar.gz";
    sha256 = "0000000000000000000000000000000000000000000000000000"; # Update with actual hash
  };
in
{
  nixpkgs.overlays = [
    (final: prev: (import (modLoaderSrc + "/overlay.nix") { src = modLoaderSrc; }) final prev)
  ];

  environment.systemPackages = with pkgs; [
    vintage-story-mod-loader
  ];
}
```

After adding the overlay, rebuild your system:

```bash
# For NixOS
sudo nixos-rebuild switch

# For Home Manager
home-manager switch
```

#### Option 2: Using the Flake

If you're using flakes, you can add this repository as an input:

**For NixOS Flakes (`flake.nix`):**

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    vintage-story-mod-loader.url = "github:PrestonHager/vintage-story-mod-loader";
  };

  outputs = { self, nixpkgs, vintage-story-mod-loader, ... }@inputs: {
    nixosConfigurations.your-hostname = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        {
          nixpkgs.overlays = [
            vintage-story-mod-loader.overlays.default
          ];
          environment.systemPackages = with pkgs; [
            vintage-story-mod-loader.packages.${system}.default
          ];
        }
      ];
    };
  };
}
```

**For Home Manager Flakes:**

```nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    home-manager.url = "github:nix-community/home-manager";
    vintage-story-mod-loader.url = "github:PrestonHager/vintage-story-mod-loader";
  };

  outputs = { self, nixpkgs, home-manager, vintage-story-mod-loader, ... }@inputs: {
    homeConfigurations.your-username = home-manager.lib.homeManagerConfiguration {
      pkgs = import nixpkgs {
        system = "x86_64-linux";
        overlays = [
          vintage-story-mod-loader.overlays.default
        ];
      };
      modules = [
        {
          home.packages = with pkgs; [
            vintage-story-mod-loader.packages.${system}.default
          ];
        }
      ];
    };
  };
}
```

#### Option 3: Using nix-env

```bash
nix-env -iA vintage-story-mod-loader -f https://github.com/PrestonHager/vintage-story-mod-loader/archive/main.tar.gz
```

**Note:** When using `fetchTarball`, you'll need to update the `sha256` hash. You can get the correct hash by running:

```bash
nix-prefetch-url --unpack https://github.com/PrestonHager/vintage-story-mod-loader/archive/main.tar.gz
```

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

# Run in development mode (starts both Vite dev server and Tauri app)
npm run tauri dev
```

**Note:** `npm run dev` only starts the Vite dev server. Use `npm run tauri dev` to run the full Tauri application.

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
