import Foundation
import Capacitor

@objc(WidgetDataPlugin)
public class WidgetDataPlugin: CAPPlugin {
    
    @objc func setWidgetData(_ call: CAPPluginCall) {
        guard let data = call.getString("data") else {
            call.reject("Must provide data string")
            return
        }
        
        // Use the App Group suite
        if let userDefaults = UserDefaults(suiteName: "group.com.journalmate.app") {
            userDefaults.set(data, forKey: "widget_data")
            userDefaults.synchronize()
            
            // Reload widget timeline
            if #available(iOS 14.0, *) {
                // We need to import WidgetKit but can't easily in a Capacitor plugin file 
                // without proper target membership. 
                // For now, we rely on the data being there and the widget refreshing itself periodically.
                // Or we can try to use a notification center post if the main app observes it.
            }
            
            call.resolve()
        } else {
            call.reject("Could not access App Group. Check entitlements.")
        }
    }
}
