import { createFileRoute } from "@tanstack/react-router";

/**
 * Apple App Site Association — required for iOS Universal Links and
 * passkey / webcredentials support. Served at
 *   /apple-app-site-association
 * MUST be application/json (no .json extension) and served over https
 * with cache-control that allows revalidation.
 *
 * The Team ID prefix + bundle ID form appID. Update the TEAM_ID once the
 * Apple Developer team is provisioned.
 */
const TEAM_ID = "TEAMID10AB"; // <-- replace with the real 10-char Team ID
const BUNDLE_ID = "app.etherealbodylabs";

const AASA = {
  applinks: {
    apps: [] as string[],
    details: [
      {
        appIDs: [`${TEAM_ID}.${BUNDLE_ID}`],
        components: [
          { "/": "/app/*", comment: "Deep-link authenticated app surfaces" },
          { "/": "/auth", comment: "OAuth return path" },
          { "/": "/auth/*", comment: "Auth callbacks" },
          { "/": "/pricing" },
          { "/": "/" },
        ],
      },
    ],
  },
  webcredentials: {
    apps: [`${TEAM_ID}.${BUNDLE_ID}`],
  },
  appclips: {
    apps: [] as string[],
  },
};

export const Route = createFileRoute("/api/public/apple-app-site-association")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify(AASA), {
          headers: {
            "content-type": "application/json",
            "cache-control": "public, max-age=300, must-revalidate",
          },
        }),
    },
  },
});
