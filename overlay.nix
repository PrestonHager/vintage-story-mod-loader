# Nix overlay for Vintage Story Mod Loader
# This overlay can be used in both flake and non-flake Nix configurations
#
# Usage:
#   - As overlay: import this file and add to nixpkgs.overlays
#   - As flake overlay: use flake.outputs.overlays.default

final: prev: let
  # Try to use rust-overlay if available, otherwise fall back to system rust
  rustToolchain = if prev ? rust-bin then
    prev.rust-bin.stable.latest.default.override {
      extensions = [ "rust-src" "rustfmt" "clippy" ];
      targets = [
        "x86_64-unknown-linux-gnu"
        "x86_64-pc-windows-gnu"
        "x86_64-apple-darwin"
        "aarch64-apple-darwin"
      ];
    }
  else
    prev.rustc;

  # Node.js version
  nodejs = prev.nodejs_20;

  # Get the source directory
  # When used as an overlay from a flake, this will be the flake source
  # When used standalone, this assumes the overlay.nix is in the repo root
  modLoaderSrc = let
    # Try to get source from parent directory (when overlay.nix is in repo root)
    repoRoot = ../.;
  in
    if builtins.pathExists (repoRoot + "/mod-loader") then
      prev.lib.cleanSource repoRoot
    else
      # Fallback: assume we're in the repo root already
      prev.lib.cleanSource ./.;

in {
  # WebKitGTK and libsoup aliases for Tauri 2.0 compatibility
  webkitgtk = prev.webkitgtk_4_1;
  libsoup = prev.libsoup_3;

  # Vintage Story Mod Loader package
  vintage-story-mod-loader = prev.stdenv.mkDerivation rec {
    pname = "vintage-story-mod-loader";
    version = "0.1.0";
    
    src = modLoaderSrc;
    
    nativeBuildInputs = with prev; [
      rustToolchain
      nodejs
      pkg-config
      openssl
      webkitgtk
      gtk3
      libsoup
      glib
      glib-networking
      librsvg
      cargo-tauri
    ];

    buildPhase = ''
      cd mod-loader
      export HOME=$TMPDIR
      npm install
      npm run build
      npm run tauri build -- --bundles appimage
    '';

    installPhase = ''
      mkdir -p $out/bin
      # Find and copy the AppImage
      APPIMAGE=$(find mod-loader/src-tauri/target/release/bundle/appimage -name "*.AppImage" | head -1)
      if [ -n "$APPIMAGE" ]; then
        cp "$APPIMAGE" $out/bin/vintage-story-mod-loader.AppImage
        chmod +x $out/bin/vintage-story-mod-loader.AppImage
        # Create a wrapper script for easier execution
        cat > $out/bin/vintage-story-mod-loader <<EOF
#!${prev.bash}/bin/bash
exec "$out/bin/vintage-story-mod-loader.AppImage" "\$@"
EOF
        chmod +x $out/bin/vintage-story-mod-loader
      else
        echo "Warning: No AppImage found in build output"
        exit 1
      fi
    '';

    meta = with prev.lib; {
      description = "A cross-platform mod loader and manager for Vintage Story";
      homepage = "https://github.com/PrestonHager/vintage-story-mod-loader";
      license = licenses.gpl3Only;
      maintainers = [ ];
      platforms = platforms.linux;
    };
  };
}

