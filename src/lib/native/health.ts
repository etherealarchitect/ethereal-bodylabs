import { registerPlugin } from "@capacitor/core";
import { isIOS } from "@/lib/platform";

/**
 * Bridge to the custom CapHealth Swift plugin (thin wrapper around
 * HKHealthStore). Not part of Capacitor core; the plugin source lives
 * under ios/App/App/Plugins/CapHealth.
 */
export interface HealthSample {
  type: string;
  value: number;
  unit: string;
  startDate: string; // ISO
  endDate: string; // ISO
  source?: string;
}

export interface CapHealthPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  requestAuthorization(opts: {
    read: string[];
    write: string[];
  }): Promise<{ granted: boolean }>;
  read(opts: {
    type: string;
    startDate: string;
    endDate: string;
    limit?: number;
  }): Promise<{ samples: HealthSample[] }>;
  write(opts: { type: string; value: number; unit: string; date: string }): Promise<void>;
  observeAnchored(opts: {
    type: string;
    anchor?: string;
  }): Promise<{ samples: HealthSample[]; anchor: string }>;
}

export const CapHealth = registerPlugin<CapHealthPlugin>("CapHealth");

export const HEALTH_READ_TYPES = [
  "HKQuantityTypeIdentifierBodyMass",
  "HKQuantityTypeIdentifierBodyFatPercentage",
  "HKQuantityTypeIdentifierLeanBodyMass",
  "HKQuantityTypeIdentifierActiveEnergyBurned",
  "HKQuantityTypeIdentifierRestingHeartRate",
  "HKCategoryTypeIdentifierSleepAnalysis",
  "HKWorkoutTypeIdentifier",
];

export const HEALTH_WRITE_TYPES = [
  "HKQuantityTypeIdentifierBodyMass",
  "HKQuantityTypeIdentifierBodyFatPercentage",
  "HKWorkoutTypeIdentifier",
];

export async function healthAvailable(): Promise<boolean> {
  if (!isIOS()) return false;
  try {
    const { available } = await CapHealth.isAvailable();
    return available;
  } catch {
    return false;
  }
}
