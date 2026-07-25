# iOS End-to-End Tests — Universal Links + Auth

XCUITest suite that verifies:

1. **Universal link routing** — tapping `https://etherealbodylabs.app/app/exercises`
   opens the native app (not Safari) via the Associated Domains handoff.
2. **Cold start + auth** — with the app killed and no session, a protected deep
   link routes through `/auth`, then lands on the originally requested path
   (plan-intent preservation).
3. **Warm start + session reuse** — with an authenticated instance backgrounded,
   a new universal link foregrounds the same instance without re-prompting.
4. **Persisted session across cold relaunch** — the Supabase session in Keychain
   hydrates silently on the next cold launch.

## Files

- `ios/App/AppUITests/UniversalLinkAuthTests.swift` — the four test cases
- `ios/App/AppUITests/AppUITestsPlan.swift` — smoke launch check
- `scripts/test-ios-e2e.sh` — one-shot runner

## Prereqs

1. **AASA published** — `https://etherealbodylabs.app/.well-known/apple-app-site-association`
   returns 200 with `application/json` and the correct `appID` (`TEAMID.app.etherealbodylabs`).
2. **Associated Domains entitlement** — `App.entitlements` contains
   `applinks:etherealbodylabs.app`.
3. **Test account seeded** — a real user in Supabase with a known password.
   Pass via `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`.
4. **UI test target added to the Xcode project** — Xcode → File → New → Target
   → *UI Testing Bundle*, name it `AppUITests`, then drag the two Swift files
   above into it. (Capacitor's generated project does not include a UI test
   target by default.)

## Run

```bash
export E2E_TEST_EMAIL=e2e@etherealbodylabs.app
export E2E_TEST_PASSWORD='YourStrongPass!'
./scripts/test-ios-e2e.sh
```

Override the simulator with `SIM_DEVICE="iPhone 15 Pro" SIM_OS=17.5`.

## CI

Wire `scripts/test-ios-e2e.sh` into the existing
`.github/workflows/ios-testflight.yml` before the TestFlight upload step, or
create a separate `ios-e2e.yml` workflow that runs on pull requests. Provide
`E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` as repository secrets.
