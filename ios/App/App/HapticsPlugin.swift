import Foundation
import Capacitor
import UIKit

@objc(HapticsPlugin)
public class HapticsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HapticsPlugin"
    public let jsName = "NativeHaptics"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "impact", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "notification", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "selection", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "vibrate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPreferences", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPreferences", returnType: CAPPluginReturnPromise)
    ]

    private var impactGenerators: [String: UIImpactFeedbackGenerator] = [:]
    private var notificationGenerator = UINotificationFeedbackGenerator()
    private var selectionGenerator = UISelectionFeedbackGenerator()

    override public func load() {
        // Pre-create generators for faster response
        impactGenerators["light"] = UIImpactFeedbackGenerator(style: .light)
        impactGenerators["medium"] = UIImpactFeedbackGenerator(style: .medium)
        impactGenerators["heavy"] = UIImpactFeedbackGenerator(style: .heavy)

        if #available(iOS 13.0, *) {
            impactGenerators["rigid"] = UIImpactFeedbackGenerator(style: .rigid)
            impactGenerators["soft"] = UIImpactFeedbackGenerator(style: .soft)
        }

        // Prepare generators for immediate feedback
        impactGenerators.values.forEach { $0.prepare() }
        notificationGenerator.prepare()
        selectionGenerator.prepare()

        print("[HapticsPlugin] Loaded and generators prepared")
    }

    // MARK: - Impact Haptic

    @objc func impact(_ call: CAPPluginCall) {
        let style = call.getString("style") ?? "medium"

        DispatchQueue.main.async { [weak self] in
            guard let generator = self?.impactGenerators[style] else {
                // Fallback to medium if style not found
                self?.impactGenerators["medium"]?.impactOccurred()
                call.resolve()
                return
            }

            generator.impactOccurred()
            generator.prepare() // Re-prepare for next use
            call.resolve()
        }
    }

    // MARK: - Notification Haptic

    @objc func notification(_ call: CAPPluginCall) {
        let typeString = call.getString("type") ?? "success"

        let type: UINotificationFeedbackGenerator.FeedbackType
        switch typeString {
        case "success":
            type = .success
        case "warning":
            type = .warning
        case "error":
            type = .error
        default:
            type = .success
        }

        DispatchQueue.main.async { [weak self] in
            self?.notificationGenerator.notificationOccurred(type)
            self?.notificationGenerator.prepare() // Re-prepare for next use
            call.resolve()
        }
    }

    // MARK: - Selection Haptic

    @objc func selection(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.selectionGenerator.selectionChanged()
            self?.selectionGenerator.prepare() // Re-prepare for next use
            call.resolve()
        }
    }

    // MARK: - Custom Vibrate Pattern

    @objc func vibrate(_ call: CAPPluginCall) {
        let pattern = call.getString("pattern") ?? "default"

        DispatchQueue.main.async { [weak self] in
            switch pattern {
            case "celebration":
                // Multi-burst celebration pattern
                self?.playCelebrationPattern()
            case "double":
                // Double tap pattern
                self?.playDoubleTapPattern()
            case "urgent":
                // Urgent attention pattern
                self?.playUrgentPattern()
            default:
                // Default single medium impact
                self?.impactGenerators["medium"]?.impactOccurred()
            }
            call.resolve()
        }
    }

    // MARK: - User Preferences

    @objc func setPreferences(_ call: CAPPluginCall) {
        let enableHaptics = call.getBool("enableHaptics") ?? true
        let enableLaunchHaptic = call.getBool("enableLaunchHaptic") ?? true
        let enableCompletionHaptic = call.getBool("enableCompletionHaptic") ?? true

        UserDefaults.standard.set(enableHaptics, forKey: "enableHaptics")
        UserDefaults.standard.set(enableLaunchHaptic, forKey: "enableLaunchHaptic")
        UserDefaults.standard.set(enableCompletionHaptic, forKey: "enableCompletionHaptic")
        UserDefaults.standard.synchronize()

        print("[HapticsPlugin] Preferences saved - haptics:\(enableHaptics), launch:\(enableLaunchHaptic), completion:\(enableCompletionHaptic)")
        call.resolve()
    }

    @objc func getPreferences(_ call: CAPPluginCall) {
        let enableHaptics = UserDefaults.standard.object(forKey: "enableHaptics") as? Bool ?? true
        let enableLaunchHaptic = UserDefaults.standard.object(forKey: "enableLaunchHaptic") as? Bool ?? true
        let enableCompletionHaptic = UserDefaults.standard.object(forKey: "enableCompletionHaptic") as? Bool ?? true

        call.resolve([
            "enableHaptics": enableHaptics,
            "enableLaunchHaptic": enableLaunchHaptic,
            "enableCompletionHaptic": enableCompletionHaptic
        ])
    }

    // MARK: - Custom Patterns

    private func playCelebrationPattern() {
        // Three quick bursts with increasing intensity
        let delays: [TimeInterval] = [0, 0.1, 0.2, 0.35]
        let styles: [UIImpactFeedbackGenerator.Style] = [.light, .medium, .heavy, .heavy]

        for (index, delay) in delays.enumerated() {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
                let style = styles[index]
                let styleKey: String
                switch style {
                case .light: styleKey = "light"
                case .medium: styleKey = "medium"
                case .heavy: styleKey = "heavy"
                default: styleKey = "medium"
                }
                self?.impactGenerators[styleKey]?.impactOccurred()
            }
        }
    }

    private func playDoubleTapPattern() {
        impactGenerators["light"]?.impactOccurred()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
            self?.impactGenerators["light"]?.impactOccurred()
        }
    }

    private func playUrgentPattern() {
        // Three heavy impacts
        for i in 0..<3 {
            DispatchQueue.main.asyncAfter(deadline: .now() + Double(i) * 0.15) { [weak self] in
                self?.impactGenerators["heavy"]?.impactOccurred()
            }
        }
    }
}
