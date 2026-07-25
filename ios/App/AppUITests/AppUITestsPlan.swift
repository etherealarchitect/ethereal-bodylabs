import XCTest

/// Shared bootstrap for the UI test target. Kept minimal — per-test setup
/// lives in each `XCTestCase` subclass.
final class AppUITestsPlan: XCTestCase {
    func test_targetLaunchesCleanly() throws {
        let app = XCUIApplication(bundleIdentifier: "app.etherealbodylabs")
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 15),
                      "App failed to launch — the UI test target is misconfigured.")
        app.terminate()
    }
}
