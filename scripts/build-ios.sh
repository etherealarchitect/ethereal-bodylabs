#!/usr/bin/env bash
# Build the web bundle and copy it into the native iOS shell.
# Requires macOS with Xcode + CocoaPods for the second stage.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "→ Building web bundle"
bun run build

echo "→ Syncing Capacitor iOS project"
npx cap sync ios

echo "✓ iOS bundle ready. Open ios/App/App.xcworkspace and run in Xcode."
