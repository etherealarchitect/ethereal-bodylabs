import { registerPlugin } from "@capacitor/core";
import { isIOS } from "@/lib/platform";

/**
 * Bridge to the custom CapPasskey Swift plugin — wraps
 * ASAuthorizationController with the platform passkey provider.
 * RP ID matches the web WebAuthn RP so credentials are portable across
 * the web build and the iOS binary.
 */
export interface CapPasskeyPlugin {
  isSupported(): Promise<{ supported: boolean }>;
  register(opts: {
    // Base64URL-encoded challenge from the server.
    challenge: string;
    rpId: string;
    userId: string; // base64url
    userName: string;
    userDisplayName: string;
  }): Promise<{
    id: string;
    rawId: string;
    type: "public-key";
    response: {
      clientDataJSON: string;
      attestationObject: string;
    };
  }>;
  assert(opts: {
    challenge: string;
    rpId: string;
    allowCredentials?: string[]; // base64url credential IDs
  }): Promise<{
    id: string;
    rawId: string;
    type: "public-key";
    response: {
      clientDataJSON: string;
      authenticatorData: string;
      signature: string;
      userHandle?: string;
    };
  }>;
}

export const CapPasskey = registerPlugin<CapPasskeyPlugin>("CapPasskey");

export async function nativePasskeysSupported(): Promise<boolean> {
  if (!isIOS()) return false;
  try {
    const { supported } = await CapPasskey.isSupported();
    return supported;
  } catch {
    return false;
  }
}
