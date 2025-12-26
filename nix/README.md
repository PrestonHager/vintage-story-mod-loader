# Nix Support for Vintage Story Mod Loader

This directory contains Nix expressions for building and developing the Vintage Story Mod Loader on NixOS and other Nix-based systems.

## Quick Start

### Using the Flake (Recommended)

If you have Nix with flakes enabled:

```bash
# Enter development shell
nix develop

# Build the application
nix build .#modLoader

# Build the documentation
nix build .#docs

# Run tests
nix develop -c cargo test
```

### Using default.nix (Traditional Nix)

If you prefer traditional Nix or don't have flakes enabled:

```bash
# Enter development shell
nix-shell nix/default.nix

# Build the application
nix-build nix/default.nix -A modLoader

# Build the documentation
nix-build nix/default.nix -A docs
```

## Development Environment

The Nix environment provides:

- **Rust toolchain** (latest stable with rust-src, rustfmt, clippy)
- **Node.js 20** with npm
- **Tauri dependencies** (webkitgtk, gtk3, libsoup, etc.)
- **Testing tools** (Playwright browsers)
- **Documentation tools** (VitePress)

## Building

### Application

```bash
# Using flake
nix build .#modLoader

# Using default.nix
nix-build nix/default.nix -A modLoader
```

The built AppImage will be available in `result/bin/`.

### Documentation

```bash
# Using flake
nix build .#docs

# Using default.nix
nix-build nix/default.nix -A docs
```

The built documentation will be available in `result/`.

## Testing

### Rust Tests

```bash
nix develop -c bash -c "cd mod-loader/src-tauri && cargo test"
```

### E2E Tests

```bash
nix develop -c bash -c "cd mod-loader && npm run test:e2e"
```

### All Tests

```bash
nix flake check
```

## Cross-Platform Building

The Nix expressions support building for multiple platforms:

- `x86_64-linux` (default)
- `aarch64-linux`
- `x86_64-darwin` (macOS Intel)
- `aarch64-darwin` (macOS Apple Silicon)

To build for a specific platform:

```bash
nix build .#modLoader --system x86_64-linux
```

## Dependencies

The Nix expressions automatically handle all dependencies, including:

- Rust toolchain and targets
- Node.js and npm packages
- System libraries (GTK, WebKit, etc.)
- Tauri build tools

## Troubleshooting

### Build Fails

1. Ensure you have Nix installed and configured
2. Try updating your nixpkgs channel: `nix-channel --update`
3. Clear the Nix store cache: `nix-collect-garbage`

### Missing Dependencies

If you encounter missing dependencies:

1. Check that all required system libraries are available
2. Try rebuilding: `nix-build --rebuild`
3. Check the error messages for specific missing packages

### Permission Issues

If you encounter permission issues with AppImage:

```bash
chmod +x result/bin/*.AppImage
```

## Integration with direnv

If you use `direnv`, you can automatically enter the development environment:

1. Install direnv: `nix-env -iA nixpkgs.direnv`
2. Add to your shell config: `eval "$(direnv hook bash)"`
3. The `.envrc` file will automatically load the Nix environment

## CI/CD

The GitHub Actions workflow (`.github/workflows/nix-build.yml`) uses Nix to:

- Build the application for multiple platforms
- Build the documentation
- Run all tests
- Perform linting checks

This ensures consistent builds across different environments.

