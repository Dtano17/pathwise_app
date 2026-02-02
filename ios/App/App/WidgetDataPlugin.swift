import Foundation
import Capacitor
import WidgetKit

@objc(WidgetDataPlugin)
public class WidgetDataPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetDataPlugin"
    public let jsName = "WidgetData"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setWidgetData", returnType: CAPPluginReturnPromise)
    ]

    @objc func setWidgetData(_ call: CAPPluginCall) {
        guard let data = call.getString("data") else {
            call.reject("Must provide data string")
            return
        }

        // Use the App Group suite
        if let userDefaults = UserDefaults(suiteName: "group.com.journalmate.app") {
            userDefaults.set(data, forKey: "widget_data")
            userDefaults.synchronize()

            // Reload widget timeline immediately
            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
                print("[WidgetDataPlugin] Widget data updated and timeline reloaded")
            }

            call.resolve()
        } else {
            call.reject("Could not access App Group. Check entitlements.")
        }
    }
}
