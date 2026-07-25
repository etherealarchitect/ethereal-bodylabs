import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.etherealbodylabs",
  appName: "Ethereal Bodylabs",
  webDir: "dist/client",
  ios: {
    contentInset: "always",
    // Serve the bundled web assets over https:// so WebAuthn, Passkeys,
    // and secure-context APIs work identically to production.
    scheme: "https",
    // Universal links from etherealbodylabs.app open the app instead of Safari.
    allowsLinkPreview: false,
    limitsNavigationsToAppBoundDomains: false,
  },
  server: {
    // In-app WebView loads the bundled build. When testing against a live
    // dev server, override with CAPACITOR_SERVER_URL at build time.
    iosScheme: "https",
    androidScheme: "https",
    // hostname is the bundled origin — MUST match RP ID for WebAuthn.
    hostname: "etherealbodylabs.app",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      launchAutoHide: true,
      backgroundColor: "#f7f6fb",
      showSpinner: false,
    },
    StatusBar: {
      style: "DEFAULT",
      backgroundColor: "#f7f6fb",
    },
    Keyboard: {
      resize: "native",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
