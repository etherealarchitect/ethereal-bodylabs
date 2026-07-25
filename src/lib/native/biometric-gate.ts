import { isIOS } from "@/lib/platform";

/**
 * Verifies the device owner via Face ID / Touch ID / passcode. Returns
 * true when the user unlocks. On web / when the native plugin is missing,
 * resolves true so downstream flows are not blocked.
 */
export async function requireBiometricUnlock(reason: string): Promise<boolean> {
  if (!isIOS()) return true;
  try {
    const { NativeBiometric } = await import("capacitor-native-biometric");
    const avail = await NativeBiometric.isAvailable();
    if (!avail.isAvailable) return true;
    await NativeBiometric.verifyIdentity({
      reason,
      title: "Unlock Ethereal Bodylabs",
      subtitle: reason,
      description: "Face ID protects your training and health data.",
    });
    return true;
  } catch {
    return false;
  }
}
