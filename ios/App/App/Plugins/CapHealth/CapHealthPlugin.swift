import Foundation
import Capacitor
import HealthKit

/// CapHealth — minimal HealthKit bridge covering the sample/write set the
/// app cares about. Anchored observation delegated back to the app via
/// per-call queries; long-lived background observers can be layered in a
/// future revision if we need background delivery.
@objc(CapHealthPlugin)
public class CapHealthPlugin: CAPPlugin {

    private let store = HKHealthStore()

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        let readIds = call.getArray("read", String.self) ?? []
        let writeIds = call.getArray("write", String.self) ?? []

        let readTypes = Set(readIds.compactMap { Self.type(for: $0) })
        let writeTypes = Set(writeIds.compactMap { Self.type(for: $0) as? HKSampleType })

        store.requestAuthorization(toShare: writeTypes, read: readTypes) { granted, error in
            if let error = error {
                call.reject("Authorization failed: \(error.localizedDescription)")
            } else {
                call.resolve(["granted": granted])
            }
        }
    }

    @objc func read(_ call: CAPPluginCall) {
        guard
            let typeId = call.getString("type"),
            let startStr = call.getString("startDate"),
            let endStr = call.getString("endDate"),
            let start = ISO8601DateFormatter().date(from: startStr),
            let end = ISO8601DateFormatter().date(from: endStr),
            let sampleType = Self.type(for: typeId) as? HKSampleType
        else {
            call.reject("Invalid read arguments"); return
        }
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end)
        let limit = call.getInt("limit") ?? HKObjectQueryNoLimit
        let query = HKSampleQuery(sampleType: sampleType, predicate: predicate,
                                  limit: limit, sortDescriptors: nil) { _, samples, error in
            if let error = error {
                call.reject("Read failed: \(error.localizedDescription)"); return
            }
            let mapped = (samples ?? []).map { Self.serialize($0) }
            call.resolve(["samples": mapped])
        }
        store.execute(query)
    }

    @objc func write(_ call: CAPPluginCall) {
        guard
            let typeId = call.getString("type"),
            let value = call.getDouble("value"),
            let unitStr = call.getString("unit"),
            let dateStr = call.getString("date"),
            let date = ISO8601DateFormatter().date(from: dateStr),
            let quantityType = Self.type(for: typeId) as? HKQuantityType
        else {
            call.reject("Invalid write arguments"); return
        }
        let quantity = HKQuantity(unit: HKUnit(from: unitStr), doubleValue: value)
        let sample = HKQuantitySample(type: quantityType, quantity: quantity, start: date, end: date)
        store.save(sample) { ok, error in
            if let error = error {
                call.reject("Write failed: \(error.localizedDescription)")
            } else {
                call.resolve()
            }
        }
    }

    // MARK: - Helpers

    private static func type(for id: String) -> HKObjectType? {
        if id == "HKWorkoutTypeIdentifier" { return HKWorkoutType.workoutType() }
        if id.hasPrefix("HKQuantityTypeIdentifier") {
            return HKObjectType.quantityType(forIdentifier: HKQuantityTypeIdentifier(rawValue: id))
        }
        if id.hasPrefix("HKCategoryTypeIdentifier") {
            return HKObjectType.categoryType(forIdentifier: HKCategoryTypeIdentifier(rawValue: id))
        }
        return nil
    }

    private static func serialize(_ sample: HKSample) -> [String: Any] {
        var value: Double = 0
        var unit = ""
        if let q = sample as? HKQuantitySample {
            // Best-effort unit selection; JS side rounds/formats.
            let preferred = q.quantityType.identifier == HKQuantityTypeIdentifier.bodyMass.rawValue
                ? HKUnit.gramUnit(with: .kilo)
                : q.quantityType.identifier == HKQuantityTypeIdentifier.bodyFatPercentage.rawValue
                ? HKUnit.percent()
                : HKUnit.count()
            value = q.quantity.doubleValue(for: preferred)
            unit = preferred.unitString
        }
        return [
            "type": sample.sampleType.identifier,
            "value": value,
            "unit": unit,
            "startDate": ISO8601DateFormatter().string(from: sample.startDate),
            "endDate": ISO8601DateFormatter().string(from: sample.endDate),
            "source": sample.sourceRevision.source.name,
        ]
    }
}
