# Ethereal Bodylabs — iOS Native Shell

Capacitor iOS wrapper around the TanStack Start web build. The `dist/client/`
bundle is embedded and served in-process by WKWebView. Native features are
exposed through Capacitor plugins under `App/App/Plugins/`.

## First-time setup (macOS required)

```bash
# From the repo root
bun install
bun run build
npx cap sync ios

cd ios/App
pod install
open App.xcworkspace
```

## Custom plugins

| Plugin        | Path                                              | Purpose                                            |
| ------------- | ------------------------------------------------- | -------------------------------------------------- |
| CapPasskey    | `App/App/Plugins/CapPasskey/`                     | ASAuthorizationController passkeys (RP web-shared) |
| CapStoreKit2  | `App/App/Plugins/CapStoreKit2/`                   | StoreKit 2 IAP + entitlements                      |
| CapHealth     | `App/App/Plugins/CapHealth/`                      | HealthKit read/write                               |

Each plugin has a matching `.m` registration file so Capacitor's JS bridge
can look it up via `registerPlugin<T>("Name")`.

## App Store Connect checklist

1. Register bundle ID `app.etherealbodylabs`.
2. Create App ID with capabilities: **Sign In with Apple**, **Push
   Notifications**, **HealthKit**, **Associated Domains**, **In-App
   Purchase**.
3. Enable **Sign In with Apple** for the Services ID used by web OAuth.
4. Upload an APNs Auth Key (.p8); paste its contents into the runtime
   secret `APNS_AUTH_KEY_P8` (plus `APNS_KEY_ID`, `APNS_TEAM_ID`,
   `APNS_BUNDLE_ID`).
5. Configure App Store Server Notifications V2 URL:
   `https://etherealbodylabs.app/api/public/iap/apple/webhook`.
6. Create the auto-renewable subscription group **Ethereal Premium** with:
   - `premium_monthly_1299` — $12.99 / month, 30-day introductory free trial
   - `premium_yearly` — matched to web yearly plan
7. Update `TEAM_ID` in `src/routes/api/public/apple-app-site-association.ts`
   to the real 10-char Team ID before shipping the first TestFlight build.

## Verifying Universal Links

After deployment, confirm the AASA is reachable and JSON-typed:

```bash
curl -I https://etherealbodylabs.app/apple-app-site-association
# Expect: Content-Type: application/json
```

Apple's CDN caches the AASA for ~24h; use the `swcutil verify` command on
a device or ship a fresh TestFlight build to force re-fetch.
