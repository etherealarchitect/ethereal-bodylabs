import { registerPlugin } from "@capacitor/core";
import { isIOS } from "@/lib/platform";
import { verifyAppleTransaction } from "@/lib/apple-iap.functions";

/**
 * Bridge to the custom CapStoreKit2 Swift plugin (ios/App/App/Plugins/CapStoreKit2).
 * On web platforms the plugin resolves to a stub that throws when called.
 */
export interface StoreKitProduct {
  id: string;
  displayPrice: string;
  displayName: string;
  description: string;
  isFamilyShareable: boolean;
  subscription?: {
    periodUnit: "day" | "week" | "month" | "year";
    periodValue: number;
    introductoryOffer?: { periodUnit: string; periodValue: number; price: string };
  };
}

export interface StoreKitTransaction {
  jwsRepresentation: string;
  productId: string;
  transactionId: string;
  originalTransactionId: string;
  expiresDate?: number;
  environment: "Sandbox" | "Production";
}

export interface CapStoreKit2Plugin {
  products(opts: { ids: string[] }): Promise<{ products: StoreKitProduct[] }>;
  purchase(opts: { productId: string; appAccountToken?: string }): Promise<StoreKitTransaction>;
  restore(): Promise<{ transactions: StoreKitTransaction[] }>;
  currentEntitlements(): Promise<{ transactions: StoreKitTransaction[] }>;
  showManageSubscriptions(): Promise<void>;
  addListener(
    eventName: "transactionUpdate",
    listener: (t: StoreKitTransaction) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}

export const CapStoreKit2 = registerPlugin<CapStoreKit2Plugin>("CapStoreKit2");

let listenerStarted = false;

/**
 * Listen for StoreKit's async Transaction.updates stream and forward each
 * signed transaction to the server for verification + entitlement upsert.
 */
export async function startStoreKitListener(): Promise<void> {
  if (!isIOS() || listenerStarted) return;
  try {
    await CapStoreKit2.addListener("transactionUpdate", (t) => {
      void verifyAppleTransaction({ data: { jws: t.jwsRepresentation } }).catch(() => {
        /* retried on next resume via currentEntitlements poll */
      });
    });
    listenerStarted = true;
  } catch {
    /* plugin missing (web / not built) */
  }
}

export async function fetchNativeProducts(ids: string[]): Promise<StoreKitProduct[]> {
  if (!isIOS()) return [];
  const { products } = await CapStoreKit2.products({ ids });
  return products;
}

export async function purchaseNative(
  productId: string,
  appAccountToken?: string,
): Promise<StoreKitTransaction> {
  const tx = await CapStoreKit2.purchase({ productId, appAccountToken });
  await verifyAppleTransaction({ data: { jws: tx.jwsRepresentation } });
  return tx;
}

export async function restoreNativePurchases(): Promise<number> {
  if (!isIOS()) return 0;
  const { transactions } = await CapStoreKit2.restore();
  for (const t of transactions) {
    await verifyAppleTransaction({ data: { jws: t.jwsRepresentation } });
  }
  return transactions.length;
}

export async function openManageSubscriptions(): Promise<void> {
  if (!isIOS()) return;
  await CapStoreKit2.showManageSubscriptions();
}
