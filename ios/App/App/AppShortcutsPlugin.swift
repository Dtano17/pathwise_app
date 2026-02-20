import Foundation
import Capacitor
import UIKit

/// iOS implementation of AppShortcutsPlugin to match Android's NativeAppShortcuts.
/// Maps Android dynamic shortcuts to iOS Home Screen Quick Actions (UIApplicationShortcutItem).
/// iOS also has richer Siri Shortcuts via JournalMateShortcuts.swift (AppIntents framework).
@objc(AppShortcutsPlugin)
public class AppShortcutsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppShortcutsPlugin"
    public let jsName = "NativeAppShortcuts"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setShortcuts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "addShortcut", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeShortcut", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getShortcuts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setupDefaultShortcuts", returnType: CAPPluginReturnPromise)
    ]

    // Map of icon names to SF Symbols
    private let iconMap: [String: String] = [
        "ic_shortcut_journal": "square.and.pencil",
        "ic_shortcut_task": "plus.circle.fill",
        "ic_shortcut_today": "checklist",
        "ic_shortcut_activities": "sparkles"
    ]

    @objc func isSupported(_ call: CAPPluginCall) {
        // Home Screen Quick Actions are supported on all modern iOS versions
        call.resolve(["supported": true])
    }

    @objc func setShortcuts(_ call: CAPPluginCall) {
        guard let shortcuts = call.getArray("shortcuts") as? [JSObject] else {
            call.reject("shortcuts array is required")
            return
        }

        var items: [UIApplicationShortcutItem] = []

        for shortcut in shortcuts {
            if let item = createShortcutItem(from: shortcut) {
                items.append(item)
            }
        }

        DispatchQueue.main.async {
            UIApplication.shared.shortcutItems = items
            print("[AppShortcuts] Set \(items.count) shortcuts")
            call.resolve(["success": true, "count": items.count])
        }
    }

    @objc func addShortcut(_ call: CAPPluginCall) {
        guard let item = createShortcutItem(from: call.dictionaryRepresentation as [String: Any]) else {
            call.reject("Invalid shortcut configuration")
            return
        }

        DispatchQueue.main.async {
            var existing = UIApplication.shared.shortcutItems ?? []

            // Replace if exists, otherwise add
            if let index = existing.firstIndex(where: { $0.type == item.type }) {
                existing[index] = item
            } else {
                existing.append(item)
            }

            UIApplication.shared.shortcutItems = existing
            print("[AppShortcuts] Added/updated shortcut: \(item.type)")
            call.resolve(["success": true])
        }
    }

    @objc func removeShortcut(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("Shortcut id is required")
            return
        }

        DispatchQueue.main.async {
            var existing = UIApplication.shared.shortcutItems ?? []
            existing.removeAll { $0.type == id }
            UIApplication.shared.shortcutItems = existing

            print("[AppShortcuts] Removed shortcut: \(id)")
            call.resolve(["success": true])
        }
    }

    @objc func getShortcuts(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let items = UIApplication.shared.shortcutItems ?? []
            let shortcuts = items.map { item -> [String: Any] in
                return [
                    "id": item.type,
                    "shortLabel": item.localizedTitle,
                    "longLabel": item.localizedSubtitle ?? ""
                ]
            }

            call.resolve(["shortcuts": shortcuts])
        }
    }

    @objc func setupDefaultShortcuts(_ call: CAPPluginCall) {
        let shortcuts: [UIApplicationShortcutItem] = [
            UIApplicationShortcutItem(
                type: "quick_journal",
                localizedTitle: "Quick Journal",
                localizedSubtitle: "Write a journal entry",
                icon: UIApplicationShortcutIcon(systemImageName: "square.and.pencil"),
                userInfo: ["action": "QUICK_JOURNAL" as NSString]
            ),
            UIApplicationShortcutItem(
                type: "add_task",
                localizedTitle: "Add Task",
                localizedSubtitle: "Create a new task",
                icon: UIApplicationShortcutIcon(systemImageName: "plus.circle.fill"),
                userInfo: ["action": "ADD_TASK" as NSString]
            ),
            UIApplicationShortcutItem(
                type: "view_today",
                localizedTitle: "Today's Tasks",
                localizedSubtitle: "View today's tasks",
                icon: UIApplicationShortcutIcon(systemImageName: "checklist"),
                userInfo: ["action": "VIEW_TODAY" as NSString]
            ),
            UIApplicationShortcutItem(
                type: "view_activities",
                localizedTitle: "Activities",
                localizedSubtitle: "View your activities",
                icon: UIApplicationShortcutIcon(systemImageName: "sparkles"),
                userInfo: ["action": "VIEW_ACTIVITIES" as NSString]
            )
        ]

        DispatchQueue.main.async {
            UIApplication.shared.shortcutItems = shortcuts
            print("[AppShortcuts] Default shortcuts set up: \(shortcuts.count)")
            call.resolve(["success": true, "count": shortcuts.count])
        }
    }

    // MARK: - Helper

    private func createShortcutItem(from dict: [String: Any]) -> UIApplicationShortcutItem? {
        guard let id = dict["id"] as? String,
              let shortLabel = dict["shortLabel"] as? String else {
            return nil
        }

        let longLabel = dict["longLabel"] as? String
        let action = dict["action"] as? String ?? id
        let iconName = dict["icon"] as? String

        var icon: UIApplicationShortcutIcon?
        if let name = iconName {
            // Try SF Symbol from icon map first, then try as SF Symbol directly
            if let sfSymbol = iconMap[name] {
                icon = UIApplicationShortcutIcon(systemImageName: sfSymbol)
            } else {
                icon = UIApplicationShortcutIcon(systemImageName: name)
            }
        }

        return UIApplicationShortcutItem(
            type: id,
            localizedTitle: shortLabel,
            localizedSubtitle: longLabel,
            icon: icon,
            userInfo: ["action": action as NSString]
        )
    }
}
