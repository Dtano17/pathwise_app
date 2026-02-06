import Foundation
import Capacitor
import UserNotifications
import UIKit

@objc(NativeNotifications)
public class NotificationPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NativeNotifications"
    public let jsName = "NativeNotifications"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "schedule", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelAll", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPending", returnType: CAPPluginReturnPromise)
    ]

    private let scheduledNotificationsKey = "scheduled_notifications"

    public override func load() {
        super.load()
        print("[NotificationPlugin] Plugin loaded")
        // Restore scheduled notifications on load (handles app restart)
        restoreScheduledNotifications()
    }

    // MARK: - Check Permission

    @objc func checkPermission(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let granted = settings.authorizationStatus == .authorized ||
                          settings.authorizationStatus == .provisional

            call.resolve([
                "granted": granted,
                "platform": "ios",
                "status": self.authStatusToString(settings.authorizationStatus)
            ])
        }
    }

    // MARK: - Request Permission

    @objc func requestPermission(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if let error = error {
                print("[NotificationPlugin] Permission error: \(error.localizedDescription)")
            }

            call.resolve([
                "granted": granted,
                "platform": "ios"
            ])
        }
    }

    // MARK: - Show Immediate Notification

    @objc func show(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? "JournalMate"
        let body = call.getString("body") ?? ""
        let id = call.getInt("id") ?? Int(Date().timeIntervalSince1970)

        print("[NotificationPlugin] show() called - Title: \(title), Body: \(body), ID: \(id)")

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.badge = 1

        // Add category for action buttons if specified
        if let category = call.getString("category") {
            content.categoryIdentifier = category
        }

        // Add userInfo for deep linking
        var userInfo: [String: Any] = [
            "notificationId": id
        ]
        if let route = call.getString("route") {
            userInfo["route"] = route
        }
        content.userInfo = userInfo

        // Trigger immediately (1 second delay to ensure delivery)
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)

        let request = UNNotificationRequest(
            identifier: "notification_\(id)",
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("[NotificationPlugin] Failed to show notification: \(error.localizedDescription)")
                call.resolve([
                    "success": false,
                    "error": error.localizedDescription
                ])
            } else {
                print("[NotificationPlugin] Notification shown successfully with ID: \(id)")
                call.resolve([
                    "success": true,
                    "id": id
                ])
            }
        }
    }

    // MARK: - Schedule Notification

    @objc func schedule(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? "JournalMate"
        let body = call.getString("body") ?? ""
        let id = call.getInt("id") ?? Int(Date().timeIntervalSince1970)

        guard let triggerAt = call.getDouble("triggerAt") else {
            call.reject("triggerAt is required (milliseconds since epoch)")
            return
        }

        let triggerDate = Date(timeIntervalSince1970: triggerAt / 1000.0)

        // If time is in the past, show immediately
        if triggerDate <= Date() {
            print("[NotificationPlugin] Scheduled time is in the past, showing immediately")
            show(call)
            return
        }

        print("[NotificationPlugin] Scheduling notification for \(triggerDate): \(title)")

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.badge = 1

        // Add category for action buttons
        if let category = call.getString("category") {
            content.categoryIdentifier = category
        } else {
            content.categoryIdentifier = "TASK_REMINDER"
        }

        // Add userInfo for deep linking
        var userInfo: [String: Any] = [
            "notificationId": id,
            "title": title,
            "body": body,
            "triggerAt": triggerAt
        ]
        if let route = call.getString("route") {
            userInfo["route"] = route
        }
        if let taskId = call.getString("taskId") {
            userInfo["taskId"] = taskId
        }
        content.userInfo = userInfo

        // Create calendar-based trigger
        let triggerComponents = Calendar.current.dateComponents(
            [.year, .month, .day, .hour, .minute, .second],
            from: triggerDate
        )
        let trigger = UNCalendarNotificationTrigger(dateMatching: triggerComponents, repeats: false)

        let request = UNNotificationRequest(
            identifier: "notification_\(id)",
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("[NotificationPlugin] Failed to schedule notification: \(error.localizedDescription)")
                call.resolve([
                    "success": false,
                    "error": error.localizedDescription
                ])
            } else {
                print("[NotificationPlugin] Notification scheduled successfully for ID: \(id)")

                // Save to UserDefaults for restoration
                self.saveScheduledNotification(id: id, title: title, body: body, triggerAt: triggerAt)

                call.resolve([
                    "success": true,
                    "id": id,
                    "scheduledAt": triggerAt
                ])
            }
        }
    }

    // MARK: - Cancel Notification

    @objc func cancel(_ call: CAPPluginCall) {
        guard let id = call.getInt("id") else {
            call.reject("Notification ID is required")
            return
        }

        let identifier = "notification_\(id)"
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [identifier])
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [identifier])

        // Remove from saved notifications
        removeScheduledNotification(id: id)

        print("[NotificationPlugin] Cancelled notification with ID: \(id)")
        call.resolve([
            "success": true
        ])
    }

    // MARK: - Cancel All Notifications

    @objc func cancelAll(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
        UNUserNotificationCenter.current().removeAllDeliveredNotifications()

        // Clear saved notifications
        UserDefaults.standard.removeObject(forKey: scheduledNotificationsKey)

        print("[NotificationPlugin] Cancelled all notifications")
        call.resolve([
            "success": true
        ])
    }

    // MARK: - Get Pending Notifications

    @objc func getPending(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getPendingNotificationRequests { requests in
            var notifications: [[String: Any]] = []

            for request in requests {
                var notif: [String: Any] = [
                    "identifier": request.identifier,
                    "title": request.content.title,
                    "body": request.content.body
                ]

                if let trigger = request.trigger as? UNCalendarNotificationTrigger,
                   let nextDate = trigger.nextTriggerDate() {
                    notif["triggerAt"] = nextDate.timeIntervalSince1970 * 1000.0
                }

                notifications.append(notif)
            }

            call.resolve([
                "notifications": notifications,
                "count": notifications.count
            ])
        }
    }

    // MARK: - Helper Methods

    private func authStatusToString(_ status: UNAuthorizationStatus) -> String {
        switch status {
        case .notDetermined:
            return "notDetermined"
        case .denied:
            return "denied"
        case .authorized:
            return "authorized"
        case .provisional:
            return "provisional"
        case .ephemeral:
            return "ephemeral"
        @unknown default:
            return "unknown"
        }
    }

    private func saveScheduledNotification(id: Int, title: String, body: String, triggerAt: Double) {
        var saved = UserDefaults.standard.dictionary(forKey: scheduledNotificationsKey) as? [String: [String: Any]] ?? [:]

        saved[String(id)] = [
            "id": id,
            "title": title,
            "body": body,
            "triggerAt": triggerAt
        ]

        UserDefaults.standard.set(saved, forKey: scheduledNotificationsKey)
        print("[NotificationPlugin] Saved scheduled notification: \(id)")
    }

    private func removeScheduledNotification(id: Int) {
        var saved = UserDefaults.standard.dictionary(forKey: scheduledNotificationsKey) as? [String: [String: Any]] ?? [:]
        saved.removeValue(forKey: String(id))
        UserDefaults.standard.set(saved, forKey: scheduledNotificationsKey)
        print("[NotificationPlugin] Removed scheduled notification: \(id)")
    }

    private func restoreScheduledNotifications() {
        guard let saved = UserDefaults.standard.dictionary(forKey: scheduledNotificationsKey) as? [String: [String: Any]] else {
            return
        }

        let currentTime = Date().timeIntervalSince1970 * 1000.0
        var restored = 0

        for (key, data) in saved {
            guard let id = data["id"] as? Int,
                  let title = data["title"] as? String,
                  let body = data["body"] as? String,
                  let triggerAt = data["triggerAt"] as? Double else {
                continue
            }

            if triggerAt > currentTime {
                // Future notification - reschedule
                let content = UNMutableNotificationContent()
                content.title = title
                content.body = body
                content.sound = .default
                content.categoryIdentifier = "TASK_REMINDER"

                let triggerDate = Date(timeIntervalSince1970: triggerAt / 1000.0)
                let triggerComponents = Calendar.current.dateComponents(
                    [.year, .month, .day, .hour, .minute, .second],
                    from: triggerDate
                )
                let trigger = UNCalendarNotificationTrigger(dateMatching: triggerComponents, repeats: false)

                let request = UNNotificationRequest(
                    identifier: "notification_\(id)",
                    content: content,
                    trigger: trigger
                )

                UNUserNotificationCenter.current().add(request) { error in
                    if let error = error {
                        print("[NotificationPlugin] Failed to restore notification \(id): \(error)")
                    }
                }
                restored += 1
            } else {
                // Past due - remove from storage
                removeScheduledNotification(id: id)
            }
        }

        if restored > 0 {
            print("[NotificationPlugin] Restored \(restored) scheduled notifications")
        }
    }
}
