import Foundation
import Capacitor

@objc(SharePlugin)
public class SharePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SharePlugin"
    public let jsName = "SharePlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getPendingShare", returnType: CAPPluginReturnPromise)
    ]

    // Static storage for pending share data
    private static var pendingShareData: String?

    // Called from AppDelegate when app receives shared content
    public static func setPendingShare(_ data: String?) {
        pendingShareData = data
    }

    @objc func getPendingShare(_ call: CAPPluginCall) {
        let data = SharePlugin.pendingShareData

        // Clear after retrieving
        SharePlugin.pendingShareData = nil

        if let shareData = data {
            call.resolve([
                "data": shareData,
                "hasData": true
            ])
        } else {
            call.resolve([
                "data": NSNull(),
                "hasData": false
            ])
        }
    }
}
