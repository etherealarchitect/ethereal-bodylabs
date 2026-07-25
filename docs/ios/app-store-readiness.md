# App Store Readiness Checklist — Ethereal Bodylabs iOS

Validate before every production submission with:
```bash
bash scripts/validate-ios-release.sh
```

The script (see `scripts/validate-ios-release.sh`) verifies most items marked **[auto]**. Human review is required for **[manual]** items.

---

## 1. Bundle & Versioning
- [auto] `CFBundleIdentifier` matches App Store Connect (`app.etherealbodylabs`).
- [auto] `CFBundleShortVersionString` bumped for each public release (SemVer).
- [auto] `CFBundleVersion` monotonically increases per upload (Fastlane `bump_build`).
- [auto] `LSRequiresIPhoneOS` = true; `UIRequiredDeviceCapabilities` = `arm64` (not `armv7`).
- [manual] Minimum deployment target ≥ iOS 15.0 (StoreKit 2, Passkeys, ASWebAuthenticationSession).

## 2. Privacy Usage Descriptions (Info.plist)
All required strings present and user-facing (no lorem ipsum):
- [auto] `NSCameraUsageDescription`
- [auto] `NSPhotoLibraryUsageDescription`
- [auto] `NSPhotoLibraryAddUsageDescription`
- [auto] `NSFaceIDUsageDescription`
- [auto] `NSHealthShareUsageDescription`
- [auto] `NSHealthUpdateUsageDescription`
- [auto] `NSUserNotificationsUsageDescription`

## 3. Privacy Manifest (Apple, required since May 2024)
- [auto] `ios/App/App/PrivacyInfo.xcprivacy` exists.
- [manual] Declares each collected data type (Health, Photos, Contact Info, Identifiers, Purchases, Usage Data) with linkage/tracking flags.
- [manual] Lists Required Reason APIs (UserDefaults, FileTimestamp, SystemBootTime, DiskSpace) used by Capacitor + plugins.
- [manual] Third-party SDKs (Capacitor Core, Supabase, Stripe if any native) have their own privacy manifests bundled.

## 4. Entitlements (App.entitlements)
- [auto] `aps-environment = production` for TestFlight/App Store builds.
- [auto] `com.apple.developer.associated-domains` contains `applinks:etherealbodylabs.app`, `applinks:www.etherealbodylabs.app`, `webcredentials:etherealbodylabs.app`.
- [auto] `com.apple.developer.healthkit` = true.
- [auto] `com.apple.developer.in-app-payments` present (StoreKit 2 does NOT require Apple Pay entitlement — remove if unused to avoid review flag).
- [auto] `com.apple.developer.applesignin` = ["Default"].
- [manual] App ID in Apple Developer portal has matching capabilities enabled.

## 5. Universal Links (AASA)
- [auto] `https://etherealbodylabs.app/.well-known/apple-app-site-association` served with `content-type: application/json`, no redirect, HTTP 200.
- [auto] AASA `appIDs` contain `<TEAM_ID>.app.etherealbodylabs`.
- [auto] `webcredentials` block includes the same app ID (Passkey autofill).
- [manual] Verified via `swcutil dl -d etherealbodylabs.app` on device.

## 6. Push Notifications (APNs)
- [auto] `aps-environment` = production.
- [auto] `UIBackgroundModes` includes `remote-notification` (silent pushes).
- [manual] APNs Auth Key (.p8) uploaded to Lovable secrets: `APNS_KEY_P8`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_ENV=production`.
- [manual] Test push delivered to a TestFlight device via `src/lib/push.functions.ts`.
- [auto] Device token registration path: `device_push_tokens` table present + RLS policies.

## 7. In-App Purchases (StoreKit 2)
- [manual] Products created in App Store Connect: `ebl.premium.monthly`, `ebl.premium.yearly` with Subscription Group.
- [manual] Introductory offer configured: 30-day free trial on both.
- [manual] Subscription metadata (name, description, review screenshot, localizations) complete.
- [manual] Paid Apps Agreement signed; banking/tax active.
- [manual] Sandbox tester account verified full purchase + restore flow.
- [auto] Server-side receipt verification path (`src/lib/apple-iap.server.ts`) reachable; App Store Server Notifications V2 endpoint registered at `/api/public/apple/notifications`.
- [manual] Web pricing page discloses Apple charge and cancellation via Settings (App Store guideline 3.1.2).

## 8. Sign in with Apple
- [manual] Required on iOS if any third-party sign-in is offered (Google/OAuth) — currently required.
- [auto] Entitlement present.
- [manual] Apple Services ID + Return URLs configured in Apple Developer portal.
- [manual] Delete-account flow available in-app (guideline 5.1.1(v)).

## 9. Networking & Security
- [auto] `NSAppTransportSecurity.NSAllowsArbitraryLoads = false` (no exceptions).
- [manual] Backend enforces HTTPS + HSTS (already done in `src/server.ts`).
- [auto] `ITSAppUsesNonExemptEncryption = false` in Info.plist (only standard HTTPS crypto used) — avoids yearly export compliance filing.

## 10. Content, Metadata, Legal
- [manual] App Name, Subtitle, Promotional Text, Description, Keywords, Support URL, Marketing URL, Privacy Policy URL (https://etherealbodylabs.app/privacy).
- [manual] Age rating questionnaire completed (health/fitness → 12+ typical).
- [manual] Screenshots: 6.7", 6.5", 5.5" iPhone; 12.9" iPad (if iPad build enabled).
- [manual] App icon 1024×1024 PNG (no alpha, no rounded corners).
- [manual] Medical disclaimer visible in-app AND in App Store description (dosing feature).
- [manual] "Account deletion" reachable within 2 taps of profile.

## 11. HealthKit-Specific Review Notes
- [manual] Reviewer notes explain which HK types are read/written and why.
- [manual] App does NOT store HK data on remote server without explicit consent per guideline 5.1.3.

## 12. Build & Signing
- [manual] Distribution certificate + App Store profile via `fastlane match appstore`.
- [manual] `fastlane beta` produces IPA and uploads to TestFlight without warnings.
- [manual] Symbols uploaded (dSYMs) for crash symbolication.

## 13. Post-Submission
- [manual] Phased release enabled.
- [manual] TestFlight external test group has ≥ 1 completed session per critical flow (auth, purchase, HK sync, push).
- [manual] Crash-free sessions ≥ 99.5% over 24h in TestFlight before promoting.
