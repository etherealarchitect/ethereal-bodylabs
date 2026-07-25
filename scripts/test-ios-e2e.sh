#!/usr/bin/env bash
# Run the iOS E2E test suite (universal links + cold/warm auth).
#
# Env vars:
#   E2E_TEST_EMAIL       — seeded test account (default: e2e@etherealbodylabs.app)
#   E2E_TEST_PASSWORD    — its password              (default: TestPass!234)
#   SIM_DEVICE           — simulator name            (default: "iPhone 15")
#   SIM_OS               — iOS version               (default: "17.5")
#   SKIP_WEB_BUILD=1     — reuse existing dist/
#
# The universal-link tests require the AASA file at
# https://etherealbodylabs.app/.well-known/apple-app-site-association to be
# reachable AND the Associated Domains entitlement to include
# `applinks:etherealbodylabs.app`. Without both, Safari will open the URL
# in-browser instead of handing off to the app and the tests will fail.

set -euo pipefail
cd "$(dirname "$0")/.."

SIM_DEVICE="${SIM_DEVICE:-iPhone 15}"
SIM_OS="${SIM_OS:-17.5}"

log() { printf '\033[1;35m→\033[0m %s\n' "$*"; }

[[ "$(uname -s)" == "Darwin" ]] || { echo "macOS required"; exit 1; }
command -v xcodebuild >/dev/null || { echo "Xcode CLT missing"; exit 1; }

if [[ -z "${SKIP_WEB_BUILD:-}" ]]; then
  log "Building web bundle"
  bun run build
fi

log "Syncing Capacitor iOS"
npx cap sync ios

log "Installing Pods"
( cd ios/App && pod install --repo-update >/dev/null )

log "Running UI tests on $SIM_DEVICE (iOS $SIM_OS)"
xcodebuild test \
  -workspace ios/App/App.xcworkspace \
  -scheme App \
  -destination "platform=iOS Simulator,name=$SIM_DEVICE,OS=$SIM_OS" \
  -only-testing:AppUITests/UniversalLinkAuthTests \
  E2E_TEST_EMAIL="${E2E_TEST_EMAIL:-e2e@etherealbodylabs.app}" \
  E2E_TEST_PASSWORD="${E2E_TEST_PASSWORD:-TestPass!234}" \
  | xcpretty || {
    echo "✗ UI tests failed. Check the xcresult bundle under DerivedData."
    exit 1
  }

log "✓ Universal-link + auth E2E tests passed"
