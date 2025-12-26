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
            meta = {
              description = "Run all test suites (Rust unit, TypeScript unit, integration, and E2E tests). By default continues on failure; set PAUSE_TEST_ON_ERROR=1 to stop on first failure.";
            };
            program = "${pkgs.writeShellApplication {
              name = "test-all";
              runtimeInputs = commonBuildInputs ++ (with pkgs; [
                playwright
                playwright.browsers
                coreutils # for timeout and mktemp
              ]);
              text = ''
                # Check if we should pause on error
                PAUSE_ON_ERROR="''${PAUSE_TEST_ON_ERROR:-0}"
                if [ "$PAUSE_ON_ERROR" = "1" ]; then
                  set -e
                else
                  set +e  # Don't exit on error, continue to next tests
                fi
                
                echo "Running all tests..."
                if [ "$PAUSE_ON_ERROR" = "1" ]; then
                  echo "(PAUSE_TEST_ON_ERROR=1: Will stop on first failure)"
                else
                  echo "(Will continue running all tests even if one fails)"
                fi
                echo ""
                
                # Track test results
                RUST_TEST_FAILED=0
                UNIT_TEST_FAILED=0
                INTEGRATION_TEST_FAILED=0
                E2E_TEST_FAILED=0
                
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
                if cargo test --workspace; then
                  echo "✓ Rust unit tests passed"
                else
                  RUST_TEST_FAILED=1
                  echo "✗ Rust unit tests failed"
                  if [ "$PAUSE_ON_ERROR" = "1" ]; then
                    exit 1
                  fi
                fi
                cd ../..
                
                echo ""
                echo "=== Running TypeScript unit tests ==="
                cd mod-loader
                npm install
                if npm run test:unit; then
                  echo "✓ TypeScript unit tests passed"
                else
                  UNIT_TEST_FAILED=1
                  echo "✗ TypeScript unit tests failed"
                  if [ "$PAUSE_ON_ERROR" = "1" ]; then
                    exit 1
                  fi
                fi
                cd ..
                
                echo ""
                echo "=== Running integration tests ==="
                cd mod-loader
                if npm run test:integration; then
                  echo "✓ Integration tests passed"
                else
                  INTEGRATION_TEST_FAILED=1
                  echo "✗ Integration tests failed"
                  if [ "$PAUSE_ON_ERROR" = "1" ]; then
                    exit 1
                  fi
                fi
                cd ..
                
                echo ""
                echo "=== Running E2E tests ==="
                cd mod-loader
                export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
                # Create symlink for browser version compatibility on NixOS
                # Playwright may expect a different version than what's in the Nix store
                # Use a writable temp directory for the symlink
                BROWSERS_DIR="${pkgs.playwright.browsers}"
                TEMP_BROWSERS_DIR=$(mktemp -d)
                if [ ! -d "$TEMP_BROWSERS_DIR" ]; then
                  echo "Failed to create temporary browsers directory for Playwright" >&2
                  exit 1
                fi
                trap 'rm -rf "$TEMP_BROWSERS_DIR"' EXIT
                # Copy symlinks to temp directory (they point to the actual browsers)
                for item in "$BROWSERS_DIR"/*; do
                  if [ -L "$item" ]; then
                    target="$(readlink -f "$item")"
                    if [ -e "$target" ]; then
                      if ! ln -sf "$target" "$TEMP_BROWSERS_DIR/$(basename "$item")"; then
                        echo "Warning: failed to create symlink for $item -> $target" >&2
                      fi
                    else
                      echo "Warning: resolved target for $item does not exist: $target" >&2
                    fi
                  fi
                done
                # Create symlink for version compatibility
                src_link="$TEMP_BROWSERS_DIR/chromium_headless_shell-1194"
                dst_link="$TEMP_BROWSERS_DIR/chromium_headless_shell-1200"
                if [ -L "$src_link" ] && [ ! -e "$dst_link" ]; then
                  src_target="$(readlink -f "$src_link")"
                  if [ -e "$src_target" ]; then
                    if ! ln -sf "$src_target" "$dst_link"; then
                      echo "Warning: failed to create compatibility symlink $dst_link from $src_target" >&2
                    fi
                  else
                    echo "Warning: resolved target for $src_link does not exist: $src_target" >&2
                  fi
                fi
                export PLAYWRIGHT_BROWSERS_PATH="$TEMP_BROWSERS_DIR"
                # Skip playwright install on NixOS - browsers are provided by Nix
                # Run tests and handle report server gracefully
                if timeout 120 npm run test:e2e; then
                  echo "✓ E2E tests passed"
                else
                  E2E_TEST_FAILED=1
                  echo "✗ E2E tests failed"
                  if [ "$PAUSE_ON_ERROR" = "1" ]; then
                    exit 1
                  fi
                fi
                # Cleanup temp directory
                rm -rf "$TEMP_BROWSERS_DIR" || true
                cd ..
                
                echo ""
                echo "=== Test Summary ==="
                TOTAL_FAILED=$((RUST_TEST_FAILED + UNIT_TEST_FAILED + INTEGRATION_TEST_FAILED + E2E_TEST_FAILED))
                if [ "$TOTAL_FAILED" -eq 0 ]; then
                  echo "✓ All tests passed!"
                  exit 0
                else
                  echo "✗ Some tests failed:"
                  [ "$RUST_TEST_FAILED" -eq 1 ] && echo "  - Rust unit tests"
                  [ "$UNIT_TEST_FAILED" -eq 1 ] && echo "  - TypeScript unit tests"
                  [ "$INTEGRATION_TEST_FAILED" -eq 1 ] && echo "  - Integration tests"
                  [ "$E2E_TEST_FAILED" -eq 1 ] && echo "  - E2E tests"
                  exit 1
                fi
              '';
            }}/bin/test-all";
          };

          # Run Rust unit tests only
          "test:rust" = {
            type = "app";
            meta = {
              description = "Run Rust unit tests only using cargo test";
            };
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
            meta = {
              description = "Run end-to-end tests using Playwright. Configured for NixOS compatibility.";
            };
            program = "${pkgs.writeShellApplication {
              name = "test-e2e";
              runtimeInputs = with pkgs; [
                nodejs
                playwright
                playwright.browsers
                coreutils # for timeout and mktemp
              ];
              text = ''
                set +e  # Don't exit on error, we'll handle it manually
                echo "Running E2E tests..."
                cd mod-loader
                export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
                npm install
                # Create symlink for browser version compatibility on NixOS
                # Playwright may expect a different version than what's in the Nix store
                # Use a writable temp directory for the symlink
                BROWSERS_DIR="${pkgs.playwright.browsers}"
                TEMP_BROWSERS_DIR=$(mktemp -d)
                trap 'rm -rf "$TEMP_BROWSERS_DIR"' EXIT
                # Copy symlinks to temp directory (they point to the actual browsers)
                for item in "$BROWSERS_DIR"/*; do
                  if [ -L "$item" ]; then
                    ln -sf "$(readlink -f "$item")" "$TEMP_BROWSERS_DIR/$(basename "$item")" || true
                  fi
                done
                # Create symlink for version compatibility
                if [ -L "$TEMP_BROWSERS_DIR/chromium_headless_shell-1194" ] && [ ! -e "$TEMP_BROWSERS_DIR/chromium_headless_shell-1200" ]; then
                  ln -sf "$(readlink -f "$TEMP_BROWSERS_DIR/chromium_headless_shell-1194")" "$TEMP_BROWSERS_DIR/chromium_headless_shell-1200" || true
                fi
                export PLAYWRIGHT_BROWSERS_PATH="$TEMP_BROWSERS_DIR"
                # Skip playwright install on NixOS - browsers are provided by Nix
                # Run tests - use timeout to prevent hanging on report server
                TEST_EXIT_CODE=0
                timeout 120 npm run test:e2e || TEST_EXIT_CODE=$?
                exit $TEST_EXIT_CODE
              '';
            }}/bin/test-e2e";
          };

          # Run integration tests
          "test:integration" = {
            type = "app";
            meta = {
              description = "Run TypeScript integration tests that test service interactions and workflows";
            };
            program = "${pkgs.writeShellApplication {
              name = "test-integration";
              runtimeInputs = with pkgs; [
                nodejs
              ];
              text = ''
                set +e  # Don't exit on error, we'll handle it manually
                echo "Running integration tests..."
                cd mod-loader
                npm install
                TEST_EXIT_CODE=0
                npm run test:integration || TEST_EXIT_CODE=$?
                exit $TEST_EXIT_CODE
              '';
            }}/bin/test-integration";
          };

          # Run TypeScript unit tests
          "test:unit" = {
            type = "app";
            meta = {
              description = "Run TypeScript unit tests using Vitest";
            };
            program = "${pkgs.writeShellApplication {
              name = "test-unit";
              runtimeInputs = with pkgs; [
                nodejs
              ];
              text = ''
                set +e  # Don't exit on error, we'll handle it manually
                echo "Running TypeScript unit tests..."
                cd mod-loader
                npm install
                TEST_EXIT_CODE=0
                npm run test:unit || TEST_EXIT_CODE=$?
                exit $TEST_EXIT_CODE
              '';
            }}/bin/test-unit";
          };
        };
      }
    );
}

