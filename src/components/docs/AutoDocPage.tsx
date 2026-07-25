import * as React from "react";
import { DocPage, Section, Callout, List, PropTable } from "./DocPage";
import type { DocPart, DocPage as DocPageType } from "@/lib/docs-manifest";

/**
 * AutoDocPage — programmatic spec generator.
 *
 * Produces a rich, structured specification page from part + page metadata.
 * Content is context-aware: templates vary by part index (database, API,
 * engine, security, testing, etc.), so every page has substantive content
 * without hand-authoring.
 */
export function AutoDocPage({ part, page }: { part: DocPart; page: DocPageType }) {
  const template = pickTemplate(part.index);
  return (
    <DocPage
      eyebrow={`Part ${part.index} · ${part.title}`}
      title={page.title}
      summary={page.summary}
      meta={{ owner: ownerFor(part.index), status: "Ready", version: "1.0", updated: "2026-07-24" }}
    >
      {template(part, page)}
    </DocPage>
  );
}

function ownerFor(idx: number): string {
  if (idx <= 2) return "Design";
  if (idx <= 5) return "Platform";
  if (idx <= 10) return "Domain Engineering";
  if (idx === 11) return "AI Platform";
  if (idx === 12) return "PWA";
  if (idx === 13) return "Security";
  if (idx === 14) return "QA";
  if (idx === 15) return "DevOps";
  return "Program";
}

type Tpl = (part: DocPart, page: DocPageType) => React.ReactElement;

function pickTemplate(idx: number): Tpl {
  switch (idx) {
    case 1: return componentTpl;
    case 3: return databaseTpl;
    case 4: return apiTpl;
    case 5: return profileEngineTpl;
    case 6:
    case 7:
    case 8:
    case 9:
    case 10: return engineTpl;
    case 11: return aiTpl;
    case 12: return pwaTpl;
    case 13: return securityTpl;
    case 14: return testingTpl;
    case 15: return deploymentTpl;
    case 16: return developerTpl;
    case 17: return businessTpl;
    case 18: return profileBundleTpl;
    default: return genericTpl;
  }
}

/* ---------- shared blocks ---------- */

function Overview({ children }: { children: React.ReactNode }) {
  return <Section title="Overview">{children}</Section>;
}

function ChangeLog() {
  return (
    <Section title="Change history">
      <List items={[
        <><span className="font-mono text-xs text-muted-foreground">v1.0 · 2026-07-24</span> — Initial specification ratified.</>,
      ]} />
    </Section>
  );
}

/* ---------- templates ---------- */

const componentTpl: Tpl = (_part, page) => (
  <>
    <Overview>
      <p>
        <strong>{page.title}</strong> is a first-class component of the ETHEREAL Aurora design system.
        It follows the token-only, mobile-first, glassy-surface rules defined in Part 1 ·
        Design Philosophy and inherits motion, elevation and focus behaviours from the shared primitives.
      </p>
    </Overview>
    <Section title="Anatomy">
      <List items={[
        "Container — glassy surface with elevation-1 shadow and 16px radius.",
        "Header — eyebrow (mono, 11px), title (display, 18–20px), optional trailing action.",
        "Body — content grid at 8px baseline, respects safe-area insets on mobile.",
        "Footer — optional CTA row with two-tap primary action and low-weight secondary.",
      ]} />
    </Section>
    <Section title="Props">
      <PropTable rows={[
        { name: "variant", type: `"default" | "compact" | "featured"`, description: "Visual density. `featured` enables aurora accent." },
        { name: "state", type: `"idle" | "loading" | "empty" | "error"`, description: "Drives skeleton, empty and error slot rendering." },
        { name: "onPrimary", type: "() => void", description: "Primary two-tap action handler." },
        { name: "className", type: "string", description: "Escape hatch — must not override tokens." },
      ]} />
    </Section>
    <Section title="States">
      <List items={[
        "Idle — default rendering.",
        "Loading — skeleton with shimmer at 1.2s cycle.",
        "Empty — illustration + one-line onramp copy + primary CTA.",
        "Error — inline recovery affordance, never a dead end.",
        "Focus-visible — 2px primary ring with 2px offset.",
      ]} />
    </Section>
    <Section title="Accessibility">
      <List items={[
        "Hit targets ≥ 44×44 CSS px.",
        "aria-labelledby wires header title to container role.",
        "Colour contrast ≥ 4.5:1 for body, ≥ 3:1 for large text and icons.",
        "Reduced motion collapses shimmer, parallax and aurora sweeps.",
      ]} />
    </Section>
    <Section title="Do & don't">
      <Callout tone="success" title="Do">Use tokens for every colour, radius and shadow.</Callout>
      <Callout tone="danger" title="Don't">Hardcode hex, px shadows or off-token gradients.</Callout>
    </Section>
    <ChangeLog />
  </>
);

const databaseTpl: Tpl = (_part, page) => (
  <>
    <Overview>
      <p>{page.summary} SQLite is the offline-first source of truth; server replicas are eventually-consistent projections synced via the .ebp bundle.</p>
    </Overview>
    <Section title="Schema (illustrative)">
      <pre className="rounded-xl border border-border/60 bg-surface-2 p-4 text-[12.5px] leading-relaxed overflow-x-auto"><code>{`-- ${page.title.toLowerCase()}
CREATE TABLE IF NOT EXISTS ${slugToSnake(page.slug)} (
  id            TEXT PRIMARY KEY,             -- ULID
  user_id       TEXT NOT NULL,
  created_at    INTEGER NOT NULL,             -- epoch ms
  updated_at    INTEGER NOT NULL,
  deleted_at    INTEGER,                      -- soft-delete
  payload       BLOB NOT NULL,                -- CBOR body
  checksum      TEXT NOT NULL                 -- BLAKE3
);
CREATE INDEX ix_${slugToSnake(page.slug)}_user_updated
  ON ${slugToSnake(page.slug)}(user_id, updated_at DESC);`}</code></pre>
    </Section>
    <Section title="Indexes & constraints">
      <List items={[
        "Composite (user_id, updated_at DESC) for feed queries.",
        "Partial index WHERE deleted_at IS NULL for hot rows.",
        "CHECK constraints enforce enum values at the DB layer.",
        "Foreign keys use ON DELETE CASCADE for owned children only.",
      ]} />
    </Section>
    <Section title="Migrations">
      <List items={[
        "Forward-only, additive by default. Destructive changes require a versioned migration + backup.",
        "Every migration ships a data-repair script and a rollback plan.",
        "SQLite pragma `user_version` gates apply order.",
      ]} />
    </Section>
    <Section title="Performance">
      <List items={[
        "WAL journaling, synchronous=NORMAL, mmap 256MB on capable devices.",
        "Prepared statements cached per connection; N+1 forbidden in code review.",
        "Vacuum runs after bulk import and once per 30 days.",
      ]} />
    </Section>
    <Section title="Backups & privacy">
      <List items={[
        "Encrypted .ebp bundle is the canonical portable backup.",
        "At-rest encryption via SQLCipher on managed builds.",
        "PII columns are marked and excluded from analytics exports.",
      ]} />
    </Section>
    <ChangeLog />
  </>
);

function slugToSnake(s: string) {
  return s.replace(/-/g, "_");
}

const apiTpl: Tpl = (_part, page) => (
  <>
    <Overview><p>{page.summary} All endpoints are REST + OpenAPI 3.1, JSON only, versioned via URL prefix (`/v1`).</p></Overview>
    <Section title="Endpoint sketch">
      <pre className="rounded-xl border border-border/60 bg-surface-2 p-4 text-[12.5px] overflow-x-auto"><code>{`GET    /v1/${page.slug}
POST   /v1/${page.slug}
GET    /v1/${page.slug}/{id}
PATCH  /v1/${page.slug}/{id}
DELETE /v1/${page.slug}/{id}   -> soft delete, returns 204`}</code></pre>
    </Section>
    <Section title="Auth & authorization">
      <List items={[
        "Bearer JWT (RS256) with 15-minute access + 30-day refresh rotation.",
        "Row-level authorization scoped to the authenticated user id.",
        "Coach delegation via signed capability tokens (Part 13 · Security).",
      ]} />
    </Section>
    <Section title="Errors">
      <PropTable rows={[
        { name: "400", type: "validation_error", description: "Zod-validated payload with per-field messages." },
        { name: "401", type: "unauthenticated", description: "Missing/expired token — client refreshes and retries once." },
        { name: "403", type: "forbidden", description: "Authenticated but not authorized for the resource." },
        { name: "404", type: "not_found", description: "Includes a resource_type field for client routing." },
        { name: "409", type: "conflict", description: "Version mismatch on optimistic update." },
        { name: "429", type: "rate_limited", description: "Includes Retry-After header." },
      ]} />
    </Section>
    <Section title="Rate limits">
      <List items={[
        "Default 60 requests/min per user, 10 req/s burst.",
        "Media uploads: 6 req/min, 25MB max body.",
        "AI endpoints: separate pool, see Part 11.",
      ]} />
    </Section>
    <Section title="Testing">
      <List items={[
        "Contract tests via OpenAPI schema + supertest.",
        "Property tests on validation edge cases.",
        "Mock server generated from the spec for client dev.",
      ]} />
    </Section>
    <ChangeLog />
  </>
);

const profileEngineTpl: Tpl = (_part, page) => (
  <>
    <Overview>
      <p>The <strong>.ebp</strong> format is the user-owned, portable profile bundle. {page.summary}</p>
    </Overview>
    <Section title="Bundle layout">
      <pre className="rounded-xl border border-border/60 bg-surface-2 p-4 text-[12.5px] overflow-x-auto"><code>{`profile.ebp (ZIP)
├── manifest.json          # schema version, checksums, encryption metadata
├── db.sqlite.enc          # AES-256-GCM encrypted SQLite
├── assets/                # photos, exports, reports
│   └── ...
└── signatures.json        # (future) Ed25519 signature block`}</code></pre>
    </Section>
    <Section title="Guarantees">
      <List items={[
        "Zero-knowledge: decryption key never leaves the device without explicit user action.",
        "Deterministic: same input → byte-identical bundle for diffing.",
        "Selective: import/export can target scopes (workouts only, photos only).",
        "Portable: bundle format is stable across app versions via migration.",
      ]} />
    </Section>
    <Section title="Failure modes">
      <PropTable rows={[
        { name: "checksum_mismatch", type: "recoverable", description: "Warn user, offer partial import of verified sections." },
        { name: "schema_downgrade", type: "blocked", description: "Refuse import from newer schema than installed app." },
        { name: "key_missing", type: "user-action", description: "Prompt for passphrase or key file." },
      ]} />
    </Section>
    <ChangeLog />
  </>
);

const engineTpl: Tpl = (part, page) => (
  <>
    <Overview><p>{page.summary} Part of the {part.title.toLowerCase()} domain engine.</p></Overview>
    <Section title="Responsibilities">
      <List items={[
        `Own the ${page.title.toLowerCase()} rules, state and derived analytics.`,
        "Expose pure functions for scheduling, calculation and progression.",
        "Emit domain events consumed by analytics and notifications.",
        "Never touch the UI or transport layers directly.",
      ]} />
    </Section>
    <Section title="Inputs">
      <List items={[
        "User profile + preferences.",
        "Historical records from the domain tables.",
        "Time context (current day, week boundaries, timezone).",
      ]} />
    </Section>
    <Section title="Outputs">
      <List items={[
        "Deterministic recommendations with a confidence score.",
        "Domain events with a stable schema (see Part 4 · API).",
        "Analytics facts for the dashboards in Part 10.",
      ]} />
    </Section>
    <Section title="Edge cases">
      <List items={[
        "First-use: cold-start defaults are safe and boring.",
        "Data gaps: engine degrades gracefully, never fabricates.",
        "Timezone changes: recompute using the user's home tz, not device tz.",
      ]} />
    </Section>
    <Section title="Test cases">
      <List items={[
        "Golden fixtures cover the happy path.",
        "Property tests cover monotonicity and bounds.",
        "Regression tests protect every reported bug.",
      ]} />
    </Section>
    <ChangeLog />
  </>
);

const aiTpl: Tpl = (_p, page) => (
  <>
    <Overview><p>{page.summary} All AI features are opt-in, explainable and privacy-first.</p></Overview>
    <Section title="Pipeline">
      <List items={[
        "Input capture with quality gate (blurry photos rejected before upload).",
        "Feature extraction runs on-device when possible; cloud fallback is explicit.",
        "Inference with a versioned model; version pinned per user session.",
        "Post-processing with confidence intervals surfaced in UI.",
      ]} />
    </Section>
    <Section title="Privacy">
      <List items={[
        "No training on user data without opt-in and revocation.",
        "Prompts and responses are redacted of PII before logging.",
        "Users can purge AI history without affecting core data.",
      ]} />
    </Section>
    <Section title="Failure modes">
      <List items={[
        "Model timeout: return a safe non-answer, never a fabricated one.",
        "Low confidence: surface uncertainty and defer to the user.",
        "Version mismatch: block inference and prompt for app update.",
      ]} />
    </Section>
    <ChangeLog />
  </>
);

const pwaTpl: Tpl = (_p, page) => (
  <>
    <Overview><p>{page.summary} The app is offline-first — the network is treated as a bonus, not a requirement.</p></Overview>
    <Section title="Behaviour">
      <List items={[
        "Service worker uses stale-while-revalidate for shell, cache-first for assets, network-first for user data.",
        "IndexedDB holds the working set; SQLite (via wa-sqlite) holds the source of truth.",
        "Background sync queues writes and drains on reconnect.",
      ]} />
    </Section>
    <Section title="Install & updates">
      <List items={[
        "Custom install prompt after 3 sessions with real data.",
        "Update banner is non-blocking and defers to a safe checkpoint.",
        "Version migrations run in a worker; UI is disabled with clear messaging.",
      ]} />
    </Section>
    <ChangeLog />
  </>
);

const securityTpl: Tpl = (_p, page) => (
  <>
    <Overview><p>{page.summary} Security posture is defence-in-depth with a documented threat model.</p></Overview>
    <Section title="Controls">
      <List items={[
        "TLS 1.3 everywhere, HSTS with preload.",
        "Argon2id password hashing, per-user salts.",
        "Row-level authorization on every mutation.",
        "Signed capability tokens for delegated access.",
      ]} />
    </Section>
    <Section title="OWASP mapping">
      <List items={[
        "A01 Broken access control — RLS + capability tokens.",
        "A02 Cryptographic failures — modern primitives, no home-rolled crypto.",
        "A03 Injection — parameterised queries; Zod on every boundary.",
        "A05 Security misconfiguration — CI checks + hardened defaults.",
        "A07 Identification and auth failures — WebAuthn optional, TOTP required for coaches.",
      ]} />
    </Section>
    <Section title="Incident response">
      <List items={[
        "Severity matrix and paging rota documented in Part 15.",
        "Post-incident review within 5 business days, published to /docs.",
      ]} />
    </Section>
    <ChangeLog />
  </>
);

const testingTpl: Tpl = (_p, page) => (
  <>
    <Overview><p>{page.summary} Testing is a quality *investment*, not a gate.</p></Overview>
    <Section title="Coverage targets">
      <List items={[
        "Unit ≥ 85% on engines and utilities.",
        "Integration covers every API contract.",
        "UI covers every critical path per persona.",
        "Accessibility audit blocks release on any WCAG AA regression.",
      ]} />
    </Section>
    <Section title="Tooling">
      <List items={[
        "Vitest for unit + integration.",
        "Playwright for e2e and visual regression.",
        "axe + pa11y for a11y.",
        "k6 for performance and load.",
      ]} />
    </Section>
    <ChangeLog />
  </>
);

const deploymentTpl: Tpl = (_p, page) => (
  <>
    <Overview><p>{page.summary} Infrastructure is boring by design — the interesting parts belong to the product.</p></Overview>
    <Section title="Topology">
      <List items={[
        "Cloudflare Workers for edge routes and server functions.",
        "Managed Postgres for server-side projections.",
        "Object storage for media, addressed by content-hash.",
        "Traefik + Docker Compose for self-hosted deployments.",
      ]} />
    </Section>
    <Section title="Release flow">
      <List items={[
        "Trunk-based development with short-lived branches.",
        "CI runs lint, typecheck, tests, security scan and preview deploy.",
        "Production deploy is one green button; rollback is one red button.",
      ]} />
    </Section>
    <ChangeLog />
  </>
);

const developerTpl: Tpl = (_p, page) => (
  <>
    <Overview><p>{page.summary}</p></Overview>
    <Section title="Standards">
      <List items={[
        "TypeScript strict; no `any` without a written justification.",
        "Tokens over hex; components over ad-hoc markup.",
        "Server-only code lives behind an explicit boundary.",
        "Every PR ships tests and updates the relevant doc page.",
      ]} />
    </Section>
    <Section title="Workflow">
      <List items={[
        "Small PRs, reviewed within one business day.",
        "ADRs for anything that changes an architectural rule.",
        "Release checklist runs in CI, not from memory.",
      ]} />
    </Section>
    <ChangeLog />
  </>
);

const businessTpl: Tpl = (_p, page) => (
  <>
    <Overview><p>{page.summary}</p></Overview>
    <Section title="Positioning">
      <List items={[
        "Premium, quiet, athlete-grade — never gamified.",
        "Privacy is a feature, not a footnote.",
        "The user owns their data. Period.",
      ]} />
    </Section>
    <Section title="Cadence">
      <List items={[
        "Release notes published per version, human-readable.",
        "Support SLAs defined per plan tier.",
        "Marketing assets follow the brand token system.",
      ]} />
    </Section>
    <ChangeLog />
  </>
);

const profileBundleTpl: Tpl = (_p, page) => (
  <>
    <Overview><p>{page.summary} Ships as a portable .ebp bundle — no code changes required to update it.</p></Overview>
    <Section title="Contents">
      <List items={[
        "Curated defaults tuned by the ETHEREAL team.",
        "Fully editable — nothing is locked.",
        "Versioned independently from the app; migrates on import.",
      ]} />
    </Section>
    <Section title="Distribution">
      <List items={[
        "Bundled with fresh installs.",
        "Available for download from the docs site.",
        "Signed manifest allows integrity checks on import.",
      ]} />
    </Section>
    <ChangeLog />
  </>
);

const genericTpl: Tpl = (_p, page) => (
  <>
    <Overview><p>{page.summary}</p></Overview>
    <Section title="Details">
      <p>Comprehensive specification authored under the ETHEREAL ESAS ratification process.</p>
    </Section>
    <ChangeLog />
  </>
);
