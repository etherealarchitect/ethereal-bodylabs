import Foundation
import Capacitor
import AuthenticationServices

/// CapPasskey — bridges JS to ASAuthorizationController with the
/// PlatformPublicKeyCredentialProvider so the app registers / asserts
/// passkeys against the same RP as the web build (`etherealbodylabs.app`).
///
/// The plugin translates SimpleWebAuthn-compatible options to Apple's API
/// and returns responses in the same JSON shape @simplewebauthn/browser
/// produces, so the existing server-side verification pipeline is reused
/// without changes.
@objc(CapPasskeyPlugin)
public class CapPasskeyPlugin: CAPPlugin, ASAuthorizationControllerDelegate,
                              ASAuthorizationControllerPresentationContextProviding {

    private var pendingCall: CAPPluginCall?

    @objc func isSupported(_ call: CAPPluginCall) {
        if #available(iOS 16.0, *) {
            call.resolve(["supported": true])
        } else {
            call.resolve(["supported": false])
        }
    }

    @objc func register(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else {
            call.reject("Passkeys require iOS 16 or later")
            return
        }
        guard
            let challenge = call.getString("challenge"),
            let rpId = call.getString("rpId"),
            let userIdB64 = call.getString("userId"),
            let userName = call.getString("userName"),
            let displayName = call.getString("userDisplayName"),
            let challengeData = Data(base64URL: challenge),
            let userIdData = Data(base64URL: userIdB64)
        else {
            call.reject("Invalid arguments")
            return
        }

        let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: rpId)
        let request = provider.createCredentialRegistrationRequest(
            challenge: challengeData,
            name: userName,
            userID: userIdData
        )
        request.displayName = displayName

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        pendingCall = call
        controller.performRequests()
    }

    @objc func assert(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else {
            call.reject("Passkeys require iOS 16 or later")
            return
        }
        guard
            let challenge = call.getString("challenge"),
            let rpId = call.getString("rpId"),
            let challengeData = Data(base64URL: challenge)
        else {
            call.reject("Invalid arguments")
            return
        }

        let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: rpId)
        let request = provider.createCredentialAssertionRequest(challenge: challengeData)
        if let allowed = call.getArray("allowCredentials", String.self) {
            request.allowedCredentials = allowed.compactMap { id in
                Data(base64URL: id).map { ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: $0) }
            }
        }

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        pendingCall = call
        controller.performRequests()
    }

    // MARK: - ASAuthorizationControllerDelegate

    public func authorizationController(controller: ASAuthorizationController,
                                        didCompleteWithAuthorization authorization: ASAuthorization) {
        guard #available(iOS 16.0, *) else { return }
        guard let call = pendingCall else { return }
        pendingCall = nil

        if let reg = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialRegistration {
            call.resolve([
                "id": reg.credentialID.base64URLEncodedString(),
                "rawId": reg.credentialID.base64URLEncodedString(),
                "type": "public-key",
                "response": [
                    "clientDataJSON": reg.rawClientDataJSON.base64URLEncodedString(),
                    "attestationObject": (reg.rawAttestationObject ?? Data()).base64URLEncodedString(),
                ],
            ])
        } else if let asr = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialAssertion {
            call.resolve([
                "id": asr.credentialID.base64URLEncodedString(),
                "rawId": asr.credentialID.base64URLEncodedString(),
                "type": "public-key",
                "response": [
                    "clientDataJSON": asr.rawClientDataJSON.base64URLEncodedString(),
                    "authenticatorData": asr.rawAuthenticatorData.base64URLEncodedString(),
                    "signature": asr.signature.base64URLEncodedString(),
                    "userHandle": asr.userID.base64URLEncodedString(),
                ],
            ])
        } else {
            call.reject("Unknown credential type")
        }
    }

    public func authorizationController(controller: ASAuthorizationController,
                                        didCompleteWithError error: Error) {
        pendingCall?.reject("Passkey authorization failed: \(error.localizedDescription)")
        pendingCall = nil
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return UIApplication.shared.windows.first ?? ASPresentationAnchor()
    }
}

// MARK: - Base64URL helpers

private extension Data {
    init?(base64URL: String) {
        var s = base64URL.replacingOccurrences(of: "-", with: "+")
                         .replacingOccurrences(of: "_", with: "/")
        let pad = 4 - (s.count % 4)
        if pad < 4 { s += String(repeating: "=", count: pad) }
        self.init(base64Encoded: s)
    }

    func base64URLEncodedString() -> String {
        return base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
