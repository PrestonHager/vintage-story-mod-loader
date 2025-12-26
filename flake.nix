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

        # Common build inputs for tests and builds (same as devShell)
        commonBuildInputs = with pkgs; [
          rustToolchain
          nodejs
          pkg-config
          openssl
          openssl.dev
          zlib
          zlib.dev
          gcc
          glibc
          webkitgtk
          webkitgtk.dev
          gtk3
          gtk3.dev
          libsoup
          libsoup.dev
          glib
          glib.dev
          glib-networking
          librsvg
          librsvg.dev
          gdk-pixbuf
          gdk-pixbuf.dev
          atk
          atk.dev
          cairo
          cairo.dev
          pango
          pango.dev
          harfbuzz
          harfbuzz.dev
          fontconfig
          fontconfig.dev
          cargo-tauri
        ];

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
        # This wraps the standalone overlay with the flake source
        overlays.default = final: prev: 
          (import ./overlay.nix { src = self; }) final prev;

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
            playwright
            playwright.browsers
          ];

          shellHook = ''
            echo "Vintage Story Mod Loader Development Environment"
            echo "================================================"
            echo "Rust: $(rustc --version)"
            echo "Node: $(node --version)"
            echo "npm: $(npm --version)"
            echo ""
            echo "In the mod-loader directory:"
            echo "  npm run tauri dev              - Start the application"
            echo "  npm run tauri build            - Build the application"
            echo "  npm run test:e2e - Run E2E tests"
            echo "In the mod-loader/src-tauri directory:"
            echo "  cargo test                     - Run Rust tests"
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

        # Test applications
        apps = {
          # Run all tests
          test = {
            type = "app";
            program = "${pkgs.writeShellApplication {
              name = "test-all";
              runtimeInputs = commonBuildInputs ++ (with pkgs; [
                playwright
                playwright.browsers
              ]);
              text = ''
                set -e
                echo "Running all tests..."
                echo ""
                
                # Set up pkg-config environment variables for cargo
                export OPENSSL_DIR="${pkgs.openssl.out}"
                export OPENSSL_LIB_DIR="${pkgs.openssl.out}/lib"
                export OPENSSL_INCLUDE_DIR="${pkgs.openssl.dev}/include"
                export LIBRARY_PATH="${pkgs.lib.makeLibraryPath [
                  pkgs.zlib
                  pkgs.openssl
                  pkgs.glib
                  pkgs.gtk3
                  pkgs.webkitgtk
                  pkgs.libsoup
                  pkgs.gdk-pixbuf
                  pkgs.atk
                  pkgs.cairo
                  pkgs.pango
                  pkgs.librsvg
                  pkgs.harfbuzz
                  pkgs.fontconfig
                ]}"
                export PKG_CONFIG_PATH="${pkgs.lib.makeSearchPath "lib/pkgconfig" [
                  pkgs.openssl.dev
                  pkgs.glib.dev
                  pkgs.gtk3.dev
                  pkgs.webkitgtk.dev
                  pkgs.libsoup.dev
                  pkgs.gdk-pixbuf.dev
                  pkgs.atk.dev
                  pkgs.cairo.dev
                  pkgs.pango.dev
                  pkgs.librsvg.dev
                  pkgs.harfbuzz.dev
                  pkgs.fontconfig.dev
                ]}"
                
                echo "=== Running Rust unit tests ==="
                cd mod-loader/src-tauri
                cargo test --workspace || exit 1
                cd ../..
                
                echo ""
                echo "=== Running E2E tests ==="
                cd mod-loader
                export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright.browsers}
                export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
                npm install
                # Create symlink for browser version compatibility on NixOS
                # Playwright may expect a different version than what's in the Nix store
                BROWSERS_DIR="${pkgs.playwright.browsers}"
                if [ -d "$BROWSERS_DIR/chromium_headless_shell-1194" ] && [ ! -e "$BROWSERS_DIR/chromium_headless_shell-1200" ]; then
                  ln -sf "$BROWSERS_DIR/chromium_headless_shell-1194" "$BROWSERS_DIR/chromium_headless_shell-1200" || true
                fi
                # Skip playwright install on NixOS - browsers are provided by Nix
                npm run test:e2e || exit 1
                cd ..
                
                echo ""
                echo "All tests passed!"
              '';
            }}/bin/test-all";
          };

          # Run Rust unit tests only
          "test:rust" = {
            type = "app";
            program = "${pkgs.writeShellApplication {
              name = "test-rust";
              runtimeInputs = commonBuildInputs;
              text = ''
                set -e
                echo "Running Rust unit tests..."
                
                # Set up pkg-config environment variables for cargo
                export OPENSSL_DIR="${pkgs.openssl.out}"
                export OPENSSL_LIB_DIR="${pkgs.openssl.out}/lib"
                export OPENSSL_INCLUDE_DIR="${pkgs.openssl.dev}/include"
                export LIBRARY_PATH="${pkgs.lib.makeLibraryPath [
                  pkgs.zlib
                  pkgs.openssl
                  pkgs.glib
                  pkgs.gtk3
                  pkgs.webkitgtk
                  pkgs.libsoup
                  pkgs.gdk-pixbuf
                  pkgs.atk
                  pkgs.cairo
                  pkgs.pango
                  pkgs.librsvg
                  pkgs.harfbuzz
                  pkgs.fontconfig
                ]}"
                export PKG_CONFIG_PATH="${pkgs.lib.makeSearchPath "lib/pkgconfig" [
                  pkgs.openssl.dev
                  pkgs.glib.dev
                  pkgs.gtk3.dev
                  pkgs.webkitgtk.dev
                  pkgs.libsoup.dev
                  pkgs.gdk-pixbuf.dev
                  pkgs.atk.dev
                  pkgs.cairo.dev
                  pkgs.pango.dev
                  pkgs.librsvg.dev
                  pkgs.harfbuzz.dev
                  pkgs.fontconfig.dev
                ]}"
                
                cd mod-loader/src-tauri
                cargo test --workspace
              '';
            }}/bin/test-rust";
          };

          # Run E2E tests only
          "test:e2e" = {
            type = "app";
            program = "${pkgs.writeShellApplication {
              name = "test-e2e";
              runtimeInputs = with pkgs; [
                nodejs
                playwright
                playwright.browsers
              ];
              text = ''
                set -e
                echo "Running E2E tests..."
                cd mod-loader
                export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright.browsers}
                export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
                npm install
                # Create symlink for browser version compatibility on NixOS
                # Playwright may expect a different version than what's in the Nix store
                BROWSERS_DIR="${pkgs.playwright.browsers}"
                if [ -d "$BROWSERS_DIR/chromium_headless_shell-1194" ] && [ ! -e "$BROWSERS_DIR/chromium_headless_shell-1200" ]; then
                  ln -sf "$BROWSERS_DIR/chromium_headless_shell-1194" "$BROWSERS_DIR/chromium_headless_shell-1200" || true
                fi
                # Skip playwright install on NixOS - browsers are provided by Nix
                npm run test:e2e
              '';
            }}/bin/test-e2e";
          };

          # Run integration tests (if they exist)
          "test:integration" = {
            type = "app";
            program = "${pkgs.writeShellApplication {
              name = "test-integration";
              runtimeInputs = with pkgs; [
                nodejs
              ];
              text = ''
                set -e
                echo "Running integration tests..."
                if [ -d "mod-loader/tests/integration" ] && [ "$(ls -A mod-loader/tests/integration)" ]; then
                  cd mod-loader
                  npm install
                  # Add integration test command here when implemented
                  echo "Integration tests not yet implemented"
                  exit 0
                else
                  echo "No integration tests found"
                  exit 0
                fi
              '';
            }}/bin/test-integration";
          };

          # Run TypeScript unit tests (if they exist)
          "test:unit" = {
            type = "app";
            program = "${pkgs.writeShellApplication {
              name = "test-unit";
              runtimeInputs = with pkgs; [
                nodejs
              ];
              text = ''
                set -e
                echo "Running TypeScript unit tests..."
                if [ -d "mod-loader/tests/unit" ] && [ "$(ls -A mod-loader/tests/unit)" ]; then
                  cd mod-loader
                  npm install
                  # Add unit test command here when implemented
                  echo "TypeScript unit tests not yet implemented"
                  exit 0
                else
                  echo "No TypeScript unit tests found"
                  exit 0
                fi
              '';
            }}/bin/test-unit";
          };
        };
      }
    );
}

