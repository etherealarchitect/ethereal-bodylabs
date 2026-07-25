#!/usr/bin/env bash
# App Store readiness validator for Ethereal Bodylabs iOS.
# Usage: bash scripts/validate-ios-release.sh
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INFO="$ROOT/ios/App/App/Info.plist"
ENT="$ROOT/ios/App/App/App.entitlements"
PRIV="$ROOT/ios/App/App/PrivacyInfo.xcprivacy"
AASA_URL="${AASA_URL:-https://etherealbodylabs.app/.well-known/apple-app-site-association}"

pass=0; fail=0; warn=0
ok()   { echo "  ✅ $1"; pass=$((pass+1)); }
bad()  { echo "  ❌ $1"; fail=$((fail+1)); }
warn() { echo "  ⚠️  $1"; warn=$((warn+1)); }
section() { echo; echo "── $1 ──"; }

grep_key() { grep -A1 "<key>$1</key>" "$2" 2>/dev/null | tail -1 | sed 's/[[:space:]]//g'; }
has_key() { grep -q "<key>$1</key>" "$2" 2>/dev/null; }

section "Files present"
[ -f "$INFO" ] && ok "Info.plist" || bad "Info.plist missing"
[ -f "$ENT" ]  && ok "App.entitlements" || bad "App.entitlements missing"
[ -f "$PRIV" ] && ok "PrivacyInfo.xcprivacy" || bad "PrivacyInfo.xcprivacy missing (Apple requires since May 2024)"

section "Info.plist — Privacy usage descriptions"
for k in NSCameraUsageDescription NSPhotoLibraryUsageDescription NSPhotoLibraryAddUsageDescription \
         NSFaceIDUsageDescription NSHealthShareUsageDescription NSHealthUpdateUsageDescription \
         NSUserNotificationsUsageDescription; do
  val=$(grep -A1 "<key>$k</key>" "$INFO" 2>/dev/null | tail -1 | sed -e 's/<[^>]*>//g' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')
  if [ -z "$val" ]; then bad "$k missing";
  elif [ ${#val} -lt 20 ]; then warn "$k too short (${#val} chars) — reviewers require specific language";
  else ok "$k (${#val} chars)"; fi
done

section "Info.plist — Bundle & device"
has_key LSRequiresIPhoneOS "$INFO" && ok "LSRequiresIPhoneOS set" || bad "LSRequiresIPhoneOS missing"
if grep -q "<string>armv7</string>" "$INFO"; then bad "UIRequiredDeviceCapabilities uses armv7 — must be arm64 for modern iOS"; else ok "arm64 device capability"; fi
if has_key ITSAppUsesNonExemptEncryption "$INFO"; then ok "ITSAppUsesNonExemptEncryption declared"; else warn "Add <key>ITSAppUsesNonExemptEncryption</key><false/> to skip yearly export compliance"; fi
if grep -q "NSAllowsArbitraryLoads</key>[[:space:]]*<true" "$INFO"; then bad "ATS allows arbitrary loads — remove for release"; else ok "ATS strict"; fi

section "Info.plist — Push background mode"
if grep -q "remote-notification" "$INFO"; then ok "UIBackgroundModes includes remote-notification"; else warn "Add UIBackgroundModes → remote-notification for silent pushes"; fi

section "Entitlements"
if grep -q "<string>production</string>" "$ENT" && grep -B1 "<string>production</string>" "$ENT" | grep -q aps-environment; then ok "aps-environment = production"; else bad "aps-environment must be 'production' for App Store"; fi
for d in "applinks:etherealbodylabs.app" "applinks:www.etherealbodylabs.app" "webcredentials:etherealbodylabs.app"; do
  grep -q "$d" "$ENT" && ok "associated-domain $d" || bad "missing associated-domain $d"
done
grep -q "com.apple.developer.healthkit" "$ENT" && ok "HealthKit entitlement" || bad "HealthKit entitlement missing"
grep -q "com.apple.developer.applesignin" "$ENT" && ok "Sign in with Apple entitlement" || bad "Sign in with Apple entitlement missing"
grep -q "com.apple.developer.in-app-payments" "$ENT" && warn "in-app-payments entitlement is for Apple Pay (PassKit) — StoreKit 2 does NOT need it. Remove unless Apple Pay is used."

section "Privacy Manifest quick sanity"
if [ -f "$PRIV" ]; then
  for cat in HealthFitness EmailAddress PhotosorVideos PurchaseHistory DeviceID; do
    grep -q "NSPrivacyCollectedDataType${cat}" "$PRIV" && ok "declares $cat" || warn "missing $cat declaration"
  done
  for api in UserDefaults FileTimestamp SystemBootTime DiskSpace; do
    grep -q "NSPrivacyAccessedAPICategory${api}" "$PRIV" && ok "Required Reason API: $api" || warn "missing Required Reason API: $api"
  done
fi

section "Universal Links (AASA) — live check"
if command -v curl >/dev/null; then
  hdrs=$(curl -sSIL --max-time 8 "$AASA_URL" 2>/dev/null)
  code=$(echo "$hdrs" | grep -E "^HTTP/" | tail -1 | awk '{print $2}')
  ctype=$(echo "$hdrs" | grep -i "^content-type:" | tail -1 | tr -d '\r')
  [ "$code" = "200" ] && ok "AASA HTTP 200" || bad "AASA HTTP $code"
  echo "$ctype" | grep -qi "application/json" && ok "AASA content-type application/json" || warn "AASA content-type: $ctype (should be application/json)"
  body=$(curl -sSL --max-time 8 "$AASA_URL" 2>/dev/null)
  echo "$body" | grep -q '"appIDs"\|"appID"' && ok "AASA contains appIDs" || bad "AASA missing appIDs"
  echo "$body" | grep -q webcredentials && ok "AASA includes webcredentials (Passkey)" || warn "AASA missing webcredentials block"
else warn "curl not available — skipped AASA live check"; fi

section "Backend readiness (env-based, non-fatal)"
for v in APNS_KEY_P8 APNS_KEY_ID APNS_TEAM_ID APNS_BUNDLE_ID; do
  if [ -n "${!v:-}" ]; then ok "$v set"; else warn "$v not set in current env (must exist in Lovable secrets for prod)"; fi
done

echo
echo "══════════════════════════════════"
echo "  PASS: $pass   WARN: $warn   FAIL: $fail"
echo "══════════════════════════════════"
[ $fail -eq 0 ] && exit 0 || exit 1
