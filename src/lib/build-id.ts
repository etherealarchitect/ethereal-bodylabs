declare const __EBL_BUILD_ID__: string | undefined;

// Stable per Vite/dev-server/build process so SSR and hydration render the
// same markup, while new deployments still expose a changed id for cache checks.
export const BUILD_ID: string =
  typeof __EBL_BUILD_ID__ === "string" && __EBL_BUILD_ID__.length > 0
    ? __EBL_BUILD_ID__
    : "dev";
