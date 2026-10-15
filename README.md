# Ethereal Bodylabs

Ethereal Bodylabs is a wellness and physique platform with a web experience and a native iOS foundation.

## Run the web app

Requirements: Node.js 20+ and npm.

```sh
npm install
npm run dev
```

## Native iOS workflow

The repository includes a Capacitor iOS shell and a SwiftUI native foundation. Use macOS with Xcode installed for simulator/device builds; iOS builds cannot be compiled or signed on a standard Windows/Linux host.

1. Install dependencies: `npm ci` (or `npm install` if no lockfile is present).
2. Build and sync the web app into the iOS project:

   ```sh
   npm run ios:sync
   ```

3. Open the generated Xcode workspace/project:

   ```sh
   npm run ios:open
   ```

4. In Xcode, choose the `App` target, set your Apple Developer Team under **Signing & Capabilities**, confirm the bundle identifier, select an iPhone simulator, then press **Run**.
5. For a connected iPhone, enable Developer Mode if requested, trust the Mac, select the device in Xcode, and run.

### Useful commands

- `npm run ios:sync` — build the web app and sync Capacitor plugins into iOS.
- `npm run ios:open` — open the iOS project in Xcode.
- `npm run ios:run` — build, sync, and run on a selected simulator/device.
- `npm run ios:doctor` — check local tools and configuration.

If the scripts `ios:doctor` or `ios:run` are not available in your checked-out branch, use the explicit commands above and the `scripts/ios-doctor.sh` helper.

## Configuration and security

- The default web origin is `https://etherealbodylabs.app`; set `CAPACITOR_SERVER_URL` only when intentionally testing another environment.
- Keep private API keys, Supabase service-role keys, and signing credentials out of source control and the client bundle.
- Use public client configuration only where intended, with server-side authorization and database row-level security.
- Before distribution, verify account deletion, privacy disclosures, notification permissions, offline/error states, accessibility, and App Store metadata.

## Release

Follow [the iOS release checklist](docs/ios-release-checklist.md). A successful local build is not the same as an App Store release: signing, physical-device QA, archive validation, and TestFlight review remain required.
