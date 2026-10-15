# iOS release checklist

## Local setup
- [ ] Use a Mac with a current Xcode version and command-line tools installed.
- [ ] Install the Node version specified by the repository (Node 20+ recommended).
- [ ] Install dependencies with `npm ci` when a lockfile exists.
- [ ] Run `npm run build` and resolve any web build errors.
- [ ] Run `npm run ios:sync` and verify Capacitor sync succeeds.
- [ ] Open the iOS project with `npm run ios:open`.

## App identity and signing
- [ ] Confirm the display name and bundle identifier.
- [ ] Select the correct Apple Developer Team.
- [ ] Review capabilities and entitlements; remove any unused permissions.
- [ ] Confirm AppIcon and launch screen assets are production-ready.
- [ ] Keep signing certificates and API secrets out of the repository.

## Quality and privacy
- [ ] Test first launch, sign-in/sign-out, expired sessions, loading, empty, network failure, and offline states.
- [ ] Test on at least one physical iPhone as well as a simulator.
- [ ] Verify VoiceOver, Dynamic Type, contrast, and touch target sizes.
- [ ] Verify privacy disclosures match actual data collection and SDK behavior.
- [ ] Verify account deletion and data export/deletion obligations.
- [ ] Confirm push notifications and camera/photo access are requested only when needed.
- [ ] Ensure all backend authorization is enforced server-side; never embed service-role keys in the app.

## Distribution
- [ ] Archive using Xcode.
- [ ] Validate the archive and upload to App Store Connect.
- [ ] Complete app privacy, age rating, screenshots, support URL, and review notes.
- [ ] Distribute to internal TestFlight testers and record issues.
- [ ] Release only after production backend and device testing are complete.
