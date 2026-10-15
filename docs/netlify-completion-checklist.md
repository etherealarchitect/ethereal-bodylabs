# Ethereal Bodylabs — Netlify completion plan

This repository is a TanStack Start + Vite application with a custom server entry (src/server.ts) and a Capacitor iOS wrapper. It is not a plain static Vite SPA: the server entry handles SSR, HTTPS redirects, Apple App Site Association rewrites, and security/cache headers. Do not deploy it by setting the publish directory to dist or adding a blanket SPA fallback without first verifying the generated Nitro output and server routes.

## Current known state
- Netlify project: etherealbodylabs
- Project dashboard: https://app.netlify.com/projects/etherealbodylabs
- Primary domain reported by Netlify: beta.etherealbodylabs.app
- GitHub repository: https://github.com/etherealarchitect/ethereal-bodylabs
- iOS/web working branch: codex/native-ios-launch
- Package scripts include npm run build, npm test, npm run lint, and Capacitor sync/open/run commands.
- The project includes package-lock.json; use npm ci for repeatable builds.
- The current Vite config uses @lovable.dev/vite-tanstack-config; comments state that its Nitro integration defaults to a Cloudflare target. Confirm Netlify compatibility before choosing a deploy adapter or publish directory.

## Ordered checklist

### 1. Connect GitHub continuous deployment
- [ ] In Netlify, open the project dashboard and go to Project configuration → Build & deploy → Continuous deployment.
- [ ] Connect the GitHub repository etherealarchitect/ethereal-bodylabs using the Netlify GitHub App/OAuth flow.
- [ ] Select the correct production branch only after confirming the intended release branch with the project owner. Do not assume codex/native-ios-launch should replace production.
- [ ] Enable Deploy Previews for pull requests.
- [ ] Enable a branch deploy for codex/native-ios-launch for review, if supported by the current plan.
- [ ] Ensure the GitHub App has repository access and the Netlify user/team is authorized to build commits from the repository.

### 2. Establish the actual framework build contract
- [ ] Run npm ci.
- [ ] Run npm run build and retain the complete logs.
- [ ] Inspect the generated Nitro output and determine the correct Netlify runtime adapter/output path for this exact TanStack Start + Nitro version.
- [ ] Confirm SSR routes, server endpoints, auth callbacks, and Apple App Site Association route are served by the server runtime, not as static files.
- [ ] Confirm static assets are published with the correct cache headers and hashed asset URLs.
- [ ] Only then commit a netlify.toml with the verified build command, publish directory, and any required adapter. Do not guess the output directory.
- [ ] Do not add a catch-all /* → /index.html rewrite unless the app has intentionally been converted to a static SPA; it can break SSR and API routes.

### 3. Configure domains and HTTPS
- [ ] Verify ownership and DNS for etherealbodylabs.app and beta.etherealbodylabs.app.
- [ ] Confirm which domain is the intended production domain and which is preview/staging.
- [ ] Ensure the production domain points to the production deploy, and staging/branch deploys cannot accidentally overwrite it.
- [ ] Verify Netlify-managed TLS certificate issuance and HTTPS redirects.
- [ ] Test canonical URL, redirects, HSTS, and mixed-content errors after deployment.
- [ ] Check the existing src/server.ts HTTPS redirect against Netlify's forwarded-protocol headers and ensure no redirect loop occurs.

### 4. Environment variables and secrets
- [ ] Inventory every required environment variable from the application and server routes.
- [ ] Configure each variable in Netlify's environment-variable UI, scoped to the correct deploy contexts and runtime scopes.
- [ ] Keep secrets out of netlify.toml, GitHub, build logs, and browser-prefixed variables such as VITE_*.
- [ ] Only publish genuinely public client configuration to the browser.
- [ ] Confirm Supabase row-level security and server-side authorization; never expose a Supabase service-role key.
- [ ] Confirm Stripe secret keys and webhook secrets are server-only; verify webhook endpoint configuration in each environment.
- [ ] Confirm auth callback URLs, OAuth redirect URLs, email/webhook origins, and allowed origins match the staging and production domains.
- [ ] After any variable change, trigger a new deploy and verify the new build/runtime uses the values.

### 5. Security and privacy
- [ ] Keep Netlify secret scanning enabled; resolve actual secret leaks by removing the value from published output and rotating the credential.
- [ ] Review Content Security Policy, frame protections, MIME sniffing, referrer policy, and permissions policy for compatibility with the app.
- [ ] Ensure sensitive API routes are not cached; confirm /api/* responses are no-store where appropriate.
- [ ] Confirm authentication, authorization, rate limits, input validation, and webhook signature verification server-side.
- [ ] Review cookies and session behavior over HTTPS.
- [ ] Verify privacy policy, terms, contact/support details, analytics consent, and data deletion behavior.

### 6. Functional smoke tests on every preview
- [ ] Homepage and primary navigation load without console errors.
- [ ] Direct navigation/refresh on nested routes works.
- [ ] Sign-up, sign-in, sign-out, expired sessions, and password recovery work.
- [ ] Core workout, nutrition, physique, and profile flows work with real backend data.
- [ ] Uploads, camera permissions, notifications, and share actions behave appropriately.
- [ ] Stripe checkout/webhooks are tested in test mode before production.
- [ ] Apple App Site Association endpoint returns valid JSON with the correct content type and no redirects.
- [ ] Universal links and passkey/WebAuthn RP ID configuration are validated for the deployed hostname.
- [ ] Mobile Safari, iPhone viewport/safe areas, accessibility, and slow/offline/error states are tested.
- [ ] Verify status codes, cache headers, build ID, redirects, and asset loading on the deployed URL.

### 7. Release controls and observability
- [ ] Keep pull-request previews separate from production.
- [ ] Require CI checks before merging release changes.
- [ ] Review Netlify build logs and browser/server error reporting after deployment.
- [ ] Confirm deployment notifications and ownership of failed builds.
- [ ] Document a fix-forward recovery process: revert/fix source and redeploy; do not assume a failed build changed the live site.
- [ ] Confirm any custom domain or production release changes with the owner before switching traffic.

### 8. iOS coordination
- [ ] Ensure the production web build is stable before creating the iOS release archive.
- [ ] Confirm capacitor.config.ts app ID app.etherealbodylabs, app display name, app icon, splash assets, and Universal Link domains.
- [ ] Run npm ci, npm run build, and npm run ios:sync on a Mac with Xcode.
- [ ] Test in an iPhone simulator and on a physical iPhone.
- [ ] Configure Apple Developer signing, privacy disclosures, App Store Connect metadata, and TestFlight.
- [ ] Keep the native app release separate from the Netlify web deployment.

## Completion criteria
Netlify is considered configured only after all of the following are verified:
1. Git integration points to the intended repository and branch.
2. A real deploy completes successfully from source.
3. The deployed URL serves the application, including SSR/API behavior.
4. Required environment variables are present in the right contexts without exposing secrets.
5. Preview and production domains/contexts are distinct and correct.
6. Smoke tests pass and logs show no blocking errors.

## Items requiring account access or owner confirmation
The connected tools available during this pass can inspect the Netlify project but cannot complete the Git provider authorization flow, run the build in Netlify, change the Git-connected build configuration, or validate a deployed runtime. Those steps must not be marked complete until the dashboard/build logs prove them. Confirm the intended production branch and domain before directing live traffic.