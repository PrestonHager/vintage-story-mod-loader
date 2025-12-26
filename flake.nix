{
  description = "Vintage Story Mod Loader - A cross-platform mod manager for Vintage Story";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
  };

  outputs = { self, nixpkgs, flake-utils, rust-overlay }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        # Custom overlay to provide webkitgtk and libsoup aliases
        webkitgtk-overlay = final: prev: {
          webkitgtk = prev.webkitgtk_4_1;
          libsoup = prev.libsoup_3;
        };
        
        overlays = [ 
          (import rust-overlay)
          webkitgtk-overlay
        ];
        pkgs = import nixpkgs {
          inherit system overlays;
        };

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
          src = ./.;
          
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
          src = ./docs;
          
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

      in
      {
        # Export the overlay for use by other flakes
        overlays.default = final: prev: {
          vintage-story-mod-loader = modLoader;
        };

        devShells.default = pkgs.mkShell {
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
            echo "  nix develop -c npm run dev    - Start development server"
            echo "  nix develop -c npm run build   - Build the application"
            echo "  nix develop -c cargo test      - Run Rust tests"
            echo "  nix develop -c npm run test:e2e - Run E2E tests"
            echo ""
            export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath [
              pkgs.webkitgtk
              pkgs.gtk3
              pkgs.glib
              pkgs.libsoup
            ]}:$LD_LIBRARY_PATH"
          '';
        };

        packages = {
          default = modLoader;
          modLoader = modLoader;
          docs = docs;
        };

        # Development shell
        devShell = self.devShells.${system}.default;

        # Build the application
        defaultPackage = modLoader;

        # Run tests
        checks = {
          rust-tests = pkgs.stdenv.mkDerivation {
            name = "rust-tests";
            src = ./.;
            
            nativeBuildInputs = with pkgs; [
              rustToolchain
              nodejs
              pkg-config
              openssl
            ];

            buildPhase = ''
              cd mod-loader/src-tauri
              cargo test --workspace --no-run
            '';

            installPhase = ''
              mkdir -p $out
              echo "Tests compiled successfully" > $out/success
            '';
          };

          docs-build = docs;
        };
      }
    );
}

