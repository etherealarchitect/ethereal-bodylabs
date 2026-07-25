#!/usr/bin/env bash
# Automated iOS build + TestFlight upload for Ethereal Bodylabs.
#
# Prereqs (macOS runner):
#   - Xcode 15+ with Command Line Tools
#   - Ruby + Bundler (`gem install bundler`)
#   - Fastlane installed via `bundle install` (see Gemfile)
#   - CocoaPods (`sudo gem install cocoapods`)
#   - Bun (or Node) for the web build
#
# Required env vars (see fastlane/.env.example):
#   APPLE_ID                       — Apple ID email for App Store Connect
#   APPLE_TEAM_ID                  — 10-char Apple Developer Team ID
#   APPLE_ITC_TEAM_ID              — App Store Connect team ID (numeric, optional)
#   APP_BUNDLE_ID                  — e.g. app.etherealbodylabs.ios
#   APP_STORE_CONNECT_API_KEY_ID   — App Store Connect API Key ID
#   APP_STORE_CONNECT_ISSUER_ID    — Issuer UUID
#   APP_STORE_CONNECT_KEY_CONTENT  — Base64-encoded .p8 private key
#   MATCH_GIT_URL                  — Git repo storing signing certs (fastlane match)
#   MATCH_PASSWORD                 — Passphrase encrypting the match repo
#   KEYCHAIN_PASSWORD              — Temp keychain password (CI only)
#
# Usage:
#   ./scripts/deploy-testflight.sh              # build web + sync + upload to TestFlight
#   SKIP_WEB_BUILD=1 ./scripts/deploy-testflight.sh
#   LANE=beta ./scripts/deploy-testflight.sh    # default lane

set -euo pipefail

cd "$(dirname "$0")/.."

LANE="${LANE:-beta}"

log() { printf '\033[1;35m→\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# --- 1. Validate environment ------------------------------------------------
required_vars=(
  APPLE_ID APPLE_TEAM_ID APP_BUNDLE_ID
  APP_STORE_CONNECT_API_KEY_ID APP_STORE_CONNECT_ISSUER_ID APP_STORE_CONNECT_KEY_CONTENT
  MATCH_GIT_URL MATCH_PASSWORD
)
missing=()
for v in "${required_vars[@]}"; do
  [[ -z "${!v:-}" ]] && missing+=("$v")
done
[[ ${#missing[@]} -gt 0 ]] && fail "Missing env vars: ${missing[*]}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  fail "TestFlight uploads require macOS (Xcode + xcodebuild)."
fi

command -v xcodebuild >/dev/null || fail "Xcode command line tools not found."
command -v bundle     >/dev/null || fail "Bundler not installed (gem install bundler)."
command -v pod        >/dev/null || fail "CocoaPods not installed (sudo gem install cocoapods)."

# --- 2. Build the web bundle -------------------------------------------------
if [[ -z "${SKIP_WEB_BUILD:-}" ]]; then
  log "Building web bundle"
  if command -v bun >/dev/null; then
    bun install --frozen-lockfile
    bun run build
  else
    npm ci
    npm run build
  fi
else
  log "SKIP_WEB_BUILD=1 — reusing existing dist/"
fi

# --- 3. Sync Capacitor + Pods -----------------------------------------------
log "Syncing Capacitor iOS project"
npx cap sync ios

log "Installing CocoaPods"
( cd ios/App && pod install --repo-update )

# --- 4. Install Fastlane deps -----------------------------------------------
log "Installing Fastlane"
bundle install --quiet

# --- 5. Run fastlane lane ---------------------------------------------------
log "Running fastlane lane: $LANE"
bundle exec fastlane ios "$LANE"

log "TestFlight upload complete."
