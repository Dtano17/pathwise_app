import Foundation
import Capacitor

@objc(SharePlugin)
public class SharePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SharePlugin"
    public let jsName = "SharePlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getPendingShare", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPendingMediaShare", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cleanupSharedMedia", returnType: CAPPluginReturnPromise)
    ]

    private let appGroupId = "group.com.journalmate.app"

    // Static storage for pending share data (URL/text shares via deep link)
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

    /// Get pending media share data stored by the Share Extension in the App Group container
    @objc func getPendingMediaShare(_ call: CAPPluginCall) {
        guard let sharedDefaults = UserDefaults(suiteName: appGroupId) else {
            call.resolve(["hasData": false, "data": NSNull()])
            return
        }

        guard let jsonString = sharedDefaults.string(forKey: "pending_share_media") else {
            call.resolve(["hasData": false, "data": NSNull()])
            return
        }

        // Clear after retrieving
        sharedDefaults.removeObject(forKey: "pending_share_media")
        sharedDefaults.synchronize()

        call.resolve([
            "hasData": true,
            "data": jsonString
        ])
    }

    /// Clean up shared media files from the App Group container
    @objc func cleanupSharedMedia(_ call: CAPPluginCall) {
        guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupId) else {
            call.resolve(["success": false])
            return
        }

        let sharedDir = containerURL.appendingPathComponent("shared_media", isDirectory: true)

        do {
            if FileManager.default.fileExists(atPath: sharedDir.path) {
                let files = try FileManager.default.contentsOfDirectory(at: sharedDir, includingPropertiesForKeys: nil)

                // Only delete files older than 1 hour
                let oneHourAgo = Date().addingTimeInterval(-3600)
                var cleaned = 0

                for file in files {
                    let attrs = try FileManager.default.attributesOfItem(atPath: file.path)
                    if let modDate = attrs[.modificationDate] as? Date, modDate < oneHourAgo {
                        try FileManager.default.removeItem(at: file)
                        cleaned += 1
                    }
                }

                print("[SharePlugin] Cleaned up \(cleaned) old shared media files")
                call.resolve(["success": true, "cleaned": cleaned])
            } else {
                call.resolve(["success": true, "cleaned": 0])
            }
        } catch {
            print("[SharePlugin] Cleanup failed: \(error)")
            call.resolve(["success": false])
        }
    }
}
