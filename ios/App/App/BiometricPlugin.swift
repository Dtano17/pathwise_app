import Foundation
import Capacitor
import LocalAuthentication

@objc(NativeBiometric)
public class BiometricPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeBiometric"
    public let jsName = "NativeBiometric"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]

    public override func load() {
        super.load()
        print("[BiometricPlugin] Plugin loaded")
    }

    // MARK: - Check Availability

    @objc func isAvailable(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?

        let canEvaluate = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)

        var result: [String: Any] = [:]

        if canEvaluate {
            result["available"] = true
            result["biometryType"] = biometryTypeToString(context.biometryType)
            result["reason"] = "Biometric authentication is available"
        } else {
            result["available"] = false
            result["biometryType"] = biometryTypeToString(context.biometryType)

            if let error = error {
                switch error.code {
                case LAError.biometryNotAvailable.rawValue:
                    result["reason"] = "No biometric hardware available"
                case LAError.biometryNotEnrolled.rawValue:
                    result["reason"] = "No biometric credentials enrolled"
                case LAError.biometryLockout.rawValue:
                    result["reason"] = "Biometric authentication is locked out"
                default:
                    result["reason"] = error.localizedDescription
                }
            } else {
                result["reason"] = "Unknown biometric status"
            }
        }

        print("[BiometricPlugin] Biometric availability: \(result)")
        call.resolve(result)
    }

    // MARK: - Authenticate

    @objc func authenticate(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? "Authenticate"
        let subtitle = call.getString("subtitle") ?? ""
        let description = call.getString("description") ?? "Use your fingerprint or face to authenticate"
        let allowDeviceCredential = call.getBool("allowDeviceCredential") ?? false

        let context = LAContext()

        // Set localized strings
        context.localizedReason = description
        if !subtitle.isEmpty {
            context.localizedCancelTitle = "Cancel"
        }

        // Determine policy based on whether device credentials are allowed
        let policy: LAPolicy = allowDeviceCredential
            ? .deviceOwnerAuthentication
            : .deviceOwnerAuthenticationWithBiometrics

        // Check if biometrics are available
        var error: NSError?
        guard context.canEvaluatePolicy(policy, error: &error) else {
            let errorMessage = error?.localizedDescription ?? "Biometric authentication not available"
            print("[BiometricPlugin] Cannot evaluate policy: \(errorMessage)")

            call.resolve([
                "success": false,
                "error": errorMessage,
                "errorCode": error?.code ?? -1,
                "cancelled": false
            ])
            return
        }

        // Perform authentication
        context.evaluatePolicy(policy, localizedReason: description) { success, authError in
            DispatchQueue.main.async {
                if success {
                    print("[BiometricPlugin] Authentication succeeded")
                    call.resolve([
                        "success": true,
                        "cancelled": false
                    ])
                } else {
                    var errorMessage = "Authentication failed"
                    var errorCode = -1
                    var cancelled = false

                    if let error = authError as? LAError {
                        errorCode = error.errorCode
                        errorMessage = error.localizedDescription

                        switch error.code {
                        case .userCancel, .appCancel, .systemCancel:
                            cancelled = true
                            errorMessage = "Authentication cancelled"
                        case .userFallback:
                            cancelled = true
                            errorMessage = "User chose to use passcode"
                        case .authenticationFailed:
                            errorMessage = "Authentication failed"
                        case .biometryNotAvailable:
                            errorMessage = "Biometric authentication not available"
                        case .biometryNotEnrolled:
                            errorMessage = "No biometric credentials enrolled"
                        case .biometryLockout:
                            errorMessage = "Biometric authentication is locked out due to too many failed attempts"
                        default:
                            errorMessage = error.localizedDescription
                        }
                    }

                    print("[BiometricPlugin] Authentication error: \(errorMessage)")
                    call.resolve([
                        "success": false,
                        "error": errorMessage,
                        "errorCode": errorCode,
                        "cancelled": cancelled
                    ])
                }
            }
        }
    }

    // MARK: - Helper Methods

    private func biometryTypeToString(_ type: LABiometryType) -> String {
        switch type {
        case .faceID:
            return "face"
        case .touchID:
            return "fingerprint"
        case .opticID:
            return "iris"
        case .none:
            return "none"
        @unknown default:
            return "biometric"
        }
    }
}
