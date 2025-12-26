{ pkgs ? import <nixpkgs> {
    overlays = [
      (final: prev: {
        webkitgtk = prev.webkitgtk_4_1;
        libsoup = prev.libsoup_3;
      })
    ];
  }
}:

let
  # Rust toolchain
  rustToolchain = pkgs.rust-bin.stable.latest.default.override {
    extensions = [ "rust-src" "rustfmt" "clippy" ];
    targets = [
      "x86_64-unknown-linux-gnu"
      "x86_64-pc-windows-gnu"
      "x86_64-apple-darwin"
      "aarch64-apple-darwin"
    ];
  };

  # Node.js version
  nodejs = pkgs.nodejs_20;

  # Build the mod loader application
  modLoader = pkgs.stdenv.mkDerivation {
    name = "vintage-story-mod-loader";
    src = ../.;
    
    nativeBuildInputs = with pkgs; [
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
      cp -r mod-loader/src-tauri/target/release/bundle/appimage/*.AppImage $out/bin/ || true
      chmod +x $out/bin/*.AppImage || true
    '';
  };

  # Build the documentation
  docs = pkgs.stdenv.mkDerivation {
    name = "vs-mod-loader-docs";
    src = ../docs;
    
    nativeBuildInputs = with pkgs; [
      nodejs
    ];

    buildPhase = ''
      npm install
      npm run build
    '';

    installPhase = ''
      mkdir -p $out
      cp -r .vitepress/dist/* $out/
    '';
  };

  # Development shell
  devShell = pkgs.mkShell {
    buildInputs = with pkgs; [
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
      # Testing tools
      playwright.browsers
    ];

    shellHook = ''
      echo "Vintage Story Mod Loader Development Environment"
      echo "================================================"
      echo "Rust: $(rustc --version)"
      echo "Node: $(node --version)"
      echo "npm: $(npm --version)"
      echo ""
      echo "Available commands:"
      echo "  npm run dev         - Start development server"
      echo "  npm run build       - Build the application"
      echo "  cargo test          - Run Rust tests"
      echo "  npm run test:e2e    - Run E2E tests"
      echo ""
      export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath [
        pkgs.webkitgtk
        pkgs.gtk3
        pkgs.glib
        pkgs.libsoup
      ]}:$LD_LIBRARY_PATH"
    '';
  };

in
{
  inherit modLoader docs devShell;
  
  # Default package
  default = modLoader;
}

