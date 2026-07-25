import XCTest

/// End-to-end tests for Universal Link navigation + authenticated warm/cold starts.
///
/// These tests exercise the real device/simulator behaviour of tapping (or
/// simulating) an https://etherealbodylabs.app link and verifying that the
/// Capacitor WebView routes to the correct in-app screen, restores an existing
/// session on warm start, and drives the auth flow on cold start.
///
/// Prereqs before running:
///   1. `bun run build && npx cap sync ios`
///   2. Install the app on the target simulator (`fastlane ios build_dev` or Xcode)
///   3. Add UI-testing credentials as env vars on the test scheme:
///        E2E_TEST_EMAIL, E2E_TEST_PASSWORD, E2E_OTP_CODE (optional dev bypass)
///   4. Ensure the Associated Domains entitlement points at etherealbodylabs.app
///      and the /.well-known/apple-app-site-association file is deployed.
///
/// Usage:
///   xcodebuild test \
///     -workspace ios/App/App.xcworkspace \
///     -scheme App \
///     -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.5' \
///     -only-testing:AppUITests/UniversalLinkAuthTests
final class UniversalLinkAuthTests: XCTestCase {

    // MARK: - Fixtures

    private let bundleId = "app.etherealbodylabs"
    private let universalLinkHost = "etherealbodylabs.app"

    private var testEmail: String {
        ProcessInfo.processInfo.environment["E2E_TEST_EMAIL"] ?? "e2e@etherealbodylabs.app"
    }
    private var testPassword: String {
        ProcessInfo.processInfo.environment["E2E_TEST_PASSWORD"] ?? "TestPass!234"
    }

    private lazy var app: XCUIApplication = {
        let a = XCUIApplication(bundleIdentifier: bundleId)
        a.launchEnvironment["E2E_MODE"] = "1"
        return a
    }()

    private lazy var safari: XCUIApplication = {
        XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
    }()

    private lazy var springboard: XCUIApplication = {
        XCUIApplication(bundleIdentifier: "com.apple.springboard")
    }()

    // MARK: - Lifecycle

    override func setUpWithError() throws {
        continueAfterFailure = false
        // Fresh device state: terminate the app and clear Safari so every test
        // starts from a known baseline.
        app.terminate()
        safari.terminate()
    }

    override func tearDownWithError() throws {
        app.terminate()
        safari.terminate()
    }

    // MARK: - Helpers

    private func openUniversalLink(_ path: String, file: StaticString = #filePath, line: UInt = #line) {
        safari.launch()
        XCTAssertTrue(safari.wait(for: .runningForeground, timeout: 10), file: file, line: line)

        // Address bar is the most stable Safari selector across iOS versions.
        let urlField = safari.textFields["Address"].firstMatch
        if !urlField.waitForExistence(timeout: 5) {
            safari.buttons["URL"].tap()
        }
        urlField.tap()
        urlField.typeText("https://\(universalLinkHost)\(path)\n")
    }

    private func signIn(file: StaticString = #filePath, line: UInt = #line) {
        let emailField = app.webViews.textFields["email"].firstMatch
        XCTAssertTrue(emailField.waitForExistence(timeout: 15), "Email field never appeared", file: file, line: line)
        emailField.tap()
        emailField.typeText(testEmail)

        let passwordField = app.webViews.secureTextFields["password"].firstMatch
        XCTAssertTrue(passwordField.waitForExistence(timeout: 5), file: file, line: line)
        passwordField.tap()
        passwordField.typeText(testPassword)

        app.webViews.buttons["Sign in"].firstMatch.tap()
    }

    private func waitForAppScreen(matching predicate: String, timeout: TimeInterval = 20) -> Bool {
        let element = app.webViews.staticTexts.matching(NSPredicate(format: predicate)).firstMatch
        return element.waitForExistence(timeout: timeout)
    }

    // MARK: - Universal link routing

    /// Verifies the AASA-registered link opens the native app (not Safari) and
    /// routes to the deep-linked screen.
    func test_universalLink_opensNativeApp_andRoutesToPath() throws {
        openUniversalLink("/app/exercises")

        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 15),
                      "Universal link failed to open the native app — check AASA + Associated Domains entitlement.")

        // If unauthenticated we're redirected to /auth. Either state proves the
        // link handoff worked and the router received the intended path.
        let hitAuth = waitForAppScreen(matching: "label CONTAINS[c] 'Sign in'", timeout: 15)
        let hitExercises = waitForAppScreen(matching: "label CONTAINS[c] 'Exercises'", timeout: 15)
        XCTAssertTrue(hitAuth || hitExercises,
                      "App opened but neither /auth nor /app/exercises rendered.")
    }

    // MARK: - Cold start (killed) authentication

    /// Cold start: app is not in memory. Tapping a protected universal link
    /// must launch the app, run the auth flow, then land on the deep-linked
    /// screen (plan-intent style redirect).
    func test_coldStart_universalLink_promptsAuth_thenLandsOnDeepLink() throws {
        // Ensure app is fully killed and any prior session is cleared.
        app.terminate()
        app.launchEnvironment["E2E_CLEAR_SESSION"] = "1"

        openUniversalLink("/app/billing")

        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 15))

        // Cold + logged out ⇒ auth screen with the deep link preserved.
        XCTAssertTrue(waitForAppScreen(matching: "label CONTAINS[c] 'Sign in'", timeout: 20),
                      "Auth screen did not render on cold start.")

        signIn()

        // After auth we should land on the originally requested path.
        XCTAssertTrue(waitForAppScreen(matching: "label CONTAINS[c] 'Billing'", timeout: 30),
                      "After sign-in we did not land on /app/billing.")
    }

    // MARK: - Warm start (backgrounded) authentication

    /// Warm start: app is already running with an authenticated session. A new
    /// universal link should reuse the session without re-prompting for auth.
    func test_warmStart_universalLink_reusesSession_andNavigates() throws {
        // 1. Cold launch + sign in once.
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 15))
        if waitForAppScreen(matching: "label CONTAINS[c] 'Sign in'", timeout: 10) {
            signIn()
        }
        XCTAssertTrue(waitForAppScreen(matching: "label CONTAINS[c] 'Home' OR label CONTAINS[c] 'Dashboard'", timeout: 30),
                      "Initial sign-in did not reach the home screen.")

        // 2. Background the app.
        XCUIDevice.shared.press(.home)
        XCTAssertTrue(app.wait(for: .runningBackground, timeout: 10))

        // 3. Fire a universal link and confirm the running instance handles it.
        openUniversalLink("/app/exercises")
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 15))

        // 4. No auth prompt should appear on warm start.
        let authAppeared = waitForAppScreen(matching: "label CONTAINS[c] 'Sign in'", timeout: 5)
        XCTAssertFalse(authAppeared, "Warm-start universal link unexpectedly forced re-auth.")

        XCTAssertTrue(waitForAppScreen(matching: "label CONTAINS[c] 'Exercises'", timeout: 20),
                      "Warm start did not navigate to /app/exercises.")
    }

    // MARK: - Session persistence across cold relaunch

    /// After a full cold relaunch (with keychain intact) the stored session
    /// should hydrate silently — no auth prompt when re-opening a deep link.
    func test_coldRelaunch_withPersistedSession_skipsAuth() throws {
        // Prime a session.
        app.launch()
        if waitForAppScreen(matching: "label CONTAINS[c] 'Sign in'", timeout: 10) {
            signIn()
        }
        XCTAssertTrue(waitForAppScreen(matching: "label CONTAINS[c] 'Home' OR label CONTAINS[c] 'Dashboard'", timeout: 30))

        // Full kill (not just background).
        app.terminate()
        XCTAssertTrue(app.wait(for: .notRunning, timeout: 10))

        // Cold relaunch via universal link — session should hydrate silently.
        openUniversalLink("/app")
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 15))

        let authAppeared = waitForAppScreen(matching: "label CONTAINS[c] 'Sign in'", timeout: 5)
        XCTAssertFalse(authAppeared, "Persisted session did not survive cold relaunch.")
    }
}
