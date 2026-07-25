import Foundation
import Capacitor
import StoreKit

/// CapStoreKit2 — thin StoreKit 2 bridge for the JS layer. Sends signed
/// `JWSRepresentation` strings up so the server can verify + upsert
/// entitlements. iOS 15+.
@available(iOS 15.0, *)
@objc(CapStoreKit2Plugin)
public class CapStoreKit2Plugin: CAPPlugin {

    private var updatesTask: Task<Void, Never>?

    override public func load() {
        // Kick off the async Transaction.updates stream once and forward
        // every verified transaction to JS via the transactionUpdate event.
        updatesTask = Task.detached { [weak self] in
            for await result in Transaction.updates {
                if case .verified(let tx) = result {
                    await tx.finish()
                    self?.notifyListeners("transactionUpdate", data: [
                        "jwsRepresentation": result.jwsRepresentation,
                        "productId": tx.productID,
                        "transactionId": String(tx.id),
                        "originalTransactionId": String(tx.originalID),
                        "expiresDate": tx.expirationDate.map { Int($0.timeIntervalSince1970 * 1000) } ?? NSNull(),
                        "environment": Self.environmentString(tx),
                    ])
                }
            }
        }
    }

    deinit { updatesTask?.cancel() }

    @objc func products(_ call: CAPPluginCall) {
        guard let ids = call.getArray("ids", String.self) else {
            call.reject("ids required"); return
        }
        Task {
            do {
                let products = try await Product.products(for: Set(ids))
                let mapped = products.map { p -> [String: Any] in
                    var dict: [String: Any] = [
                        "id": p.id,
                        "displayName": p.displayName,
                        "description": p.description,
                        "displayPrice": p.displayPrice,
                        "isFamilyShareable": p.isFamilyShareable,
                    ]
                    if let sub = p.subscription {
                        dict["subscription"] = [
                            "periodUnit": Self.periodUnit(sub.subscriptionPeriod.unit),
                            "periodValue": sub.subscriptionPeriod.value,
                        ]
                    }
                    return dict
                }
                call.resolve(["products": mapped])
            } catch {
                call.reject("Products lookup failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId") else {
            call.reject("productId required"); return
        }
        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("Product not found"); return
                }
                var options: Set<Product.PurchaseOption> = []
                if let tokenStr = call.getString("appAccountToken"),
                   let uuid = UUID(uuidString: tokenStr) {
                    options.insert(.appAccountToken(uuid))
                }
                let result = try await product.purchase(options: options)
                switch result {
                case .success(let verification):
                    guard case .verified(let tx) = verification else {
                        call.reject("Transaction failed verification"); return
                    }
                    await tx.finish()
                    call.resolve([
                        "jwsRepresentation": verification.jwsRepresentation,
                        "productId": tx.productID,
                        "transactionId": String(tx.id),
                        "originalTransactionId": String(tx.originalID),
                        "expiresDate": tx.expirationDate.map { Int($0.timeIntervalSince1970 * 1000) } ?? NSNull(),
                        "environment": Self.environmentString(tx),
                    ])
                case .userCancelled:
                    call.reject("USER_CANCELLED")
                case .pending:
                    call.reject("PENDING")
                @unknown default:
                    call.reject("UNKNOWN_RESULT")
                }
            } catch {
                call.reject("Purchase failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                let txs = await Self.currentEntitlements()
                call.resolve(["transactions": txs])
            } catch {
                call.reject("Restore failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func currentEntitlements(_ call: CAPPluginCall) {
        Task {
            let txs = await Self.currentEntitlements()
            call.resolve(["transactions": txs])
        }
    }

    @objc func showManageSubscriptions(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene else {
                call.reject("No window scene"); return
            }
            do {
                try await AppStore.showManageSubscriptions(in: scene)
                call.resolve()
            } catch {
                call.reject("Manage failed: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Helpers

    private static func currentEntitlements() async -> [[String: Any]] {
        var out: [[String: Any]] = []
        for await result in Transaction.currentEntitlements {
            if case .verified(let tx) = result {
                out.append([
                    "jwsRepresentation": result.jwsRepresentation,
                    "productId": tx.productID,
                    "transactionId": String(tx.id),
                    "originalTransactionId": String(tx.originalID),
                    "expiresDate": tx.expirationDate.map { Int($0.timeIntervalSince1970 * 1000) } ?? NSNull(),
                    "environment": environmentString(tx),
                ])
            }
        }
        return out
    }

    private static func environmentString(_ tx: Transaction) -> String {
        if #available(iOS 16.0, *) {
            return tx.environment == .production ? "Production" : "Sandbox"
        } else {
            return "Production"
        }
    }

    private static func periodUnit(_ unit: Product.SubscriptionPeriod.Unit) -> String {
        switch unit {
        case .day: return "day"
        case .week: return "week"
        case .month: return "month"
        case .year: return "year"
        @unknown default: return "month"
        }
    }
}
