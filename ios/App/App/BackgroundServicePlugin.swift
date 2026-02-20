import Foundation
import Capacitor
import UIKit
import UserNotifications
import WidgetKit
import BackgroundTasks

/// iOS implementation of BackgroundServicePlugin to match Android's BackgroundServicePlugin.
/// Maps Android concepts to iOS equivalents:
/// - Foreground service → Live Activity / persistent notification (no-op on iOS, handled differently)
/// - WorkManager background sync → BGTaskScheduler (already in AppDelegate)
/// - SharedPreferences → UserDefaults
/// - AppWidgetManager → WidgetKit
/// - Notifications → UNUserNotificationCenter
/// - Haptics → UIFeedbackGenerator
@objc(BackgroundServicePlugin)
public class BackgroundServicePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BackgroundServicePlugin"
    public let jsName = "BackgroundService"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startForegroundService", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopForegroundService", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateProgress", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "enableBackgroundSync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disableBackgroundSync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setUserCredentials", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearUserCredentials", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setReminderPreferences", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateWidgetData", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "refreshWidgets", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showNotification", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "triggerHaptic", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelNotification", returnType: CAPPluginReturnPromise)
    ]

    private let prefsName = "journalmate_prefs"
    private let widgetPrefsName = "journalmate_widget"
    private let appGroupId = "group.com.journalmate.app"

    private lazy var prefs: UserDefaults = {
        return UserDefaults.standard
    }()

    // MARK: - Foreground Service (iOS equivalent: no-op, use Live Activities instead)

    /// iOS doesn't have foreground services. Return success for API compatibility.
    @objc func startForegroundService(_ call: CAPPluginCall) {
        print("[BackgroundService] startForegroundService - iOS uses Live Activities instead")
        call.resolve(["success": true])
    }

    @objc func stopForegroundService(_ call: CAPPluginCall) {
        print("[BackgroundService] stopForegroundService - no-op on iOS")
        call.resolve(["success": true])
    }

    /// Update progress data — stores in UserDefaults for widget/Live Activity
    @objc func updateProgress(_ call: CAPPluginCall) {
        let completedTasks = call.getInt("completedTasks") ?? 0
        let totalTasks = call.getInt("totalTasks") ?? 0
        let streak = call.getInt("streak") ?? 0
        let nextTaskTitle = call.getString("nextTaskTitle")
        let nextTaskTime = call.getString("nextTaskTime")

        prefs.set(completedTasks, forKey: "progress_completed_tasks")
        prefs.set(totalTasks, forKey: "progress_total_tasks")
        prefs.set(streak, forKey: "progress_streak")
        if let title = nextTaskTitle { prefs.set(title, forKey: "progress_next_task_title") }
        if let time = nextTaskTime { prefs.set(time, forKey: "progress_next_task_time") }

        print("[BackgroundService] Progress updated: \(completedTasks)/\(totalTasks), streak: \(streak)")
        call.resolve(["success": true])
    }

    // MARK: - Background Sync (iOS uses BGTaskScheduler, configured in AppDelegate)

    @objc func enableBackgroundSync(_ call: CAPPluginCall) {
        let intervalMinutes = call.getInt("intervalMinutes") ?? 60

        prefs.set(true, forKey: "background_sync_enabled")
        prefs.set(intervalMinutes, forKey: "sync_interval_minutes")

        // Schedule background task via BGTaskScheduler
        scheduleBackgroundSync(intervalMinutes: intervalMinutes)

        print("[BackgroundService] Background sync enabled, interval: \(intervalMinutes) min")
        call.resolve(["success": true, "intervalMinutes": intervalMinutes])
    }

    @objc func disableBackgroundSync(_ call: CAPPluginCall) {
        prefs.set(false, forKey: "background_sync_enabled")

        // Cancel pending background tasks
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: "ai.journalmate.app.reminderSync")

        print("[BackgroundService] Background sync disabled")
        call.resolve(["success": true])
    }

    private func scheduleBackgroundSync(intervalMinutes: Int) {
        let request = BGAppRefreshTaskRequest(identifier: "ai.journalmate.app.reminderSync")
        // iOS enforces minimum of ~15 minutes; the actual interval is system-managed
        request.earliestBeginDate = Date(timeIntervalSinceNow: Double(max(intervalMinutes, 15)) * 60)

        do {
            try BGTaskScheduler.shared.submit(request)
            print("[BackgroundService] Background sync scheduled")
        } catch {
            print("[BackgroundService] Failed to schedule background sync: \(error)")
        }
    }

    // MARK: - User Credentials

    @objc func setUserCredentials(_ call: CAPPluginCall) {
        let userId = call.getString("userId") ?? ""
        let authToken = call.getString("authToken") ?? ""

        prefs.set(userId, forKey: "userId")
        prefs.set(authToken, forKey: "auth_token")

        print("[BackgroundService] Credentials stored for user: \(userId)")
        call.resolve(["success": true])
    }

    @objc func clearUserCredentials(_ call: CAPPluginCall) {
        prefs.removeObject(forKey: "userId")
        prefs.removeObject(forKey: "auth_token")

        print("[BackgroundService] Credentials cleared")
        call.resolve(["success": true])
    }

    // MARK: - Reminder Preferences

    @objc func setReminderPreferences(_ call: CAPPluginCall) {
        let minutesBefore = call.getInt("minutesBefore") ?? 30

        prefs.set(minutesBefore, forKey: "reminder_lead_time")

        print("[BackgroundService] Reminder lead time set to \(minutesBefore) minutes")
        call.resolve(["success": true])
    }

    // MARK: - Widget Data

    @objc func updateWidgetData(_ call: CAPPluginCall) {
        let tasksCompleted = call.getInt("tasksCompleted") ?? 0
        let tasksTotal = call.getInt("tasksTotal") ?? 0
        let streak = call.getInt("streak") ?? 0
        let totalCompleted = call.getInt("totalCompleted") ?? 0
        let completionRate = call.getFloat("completionRate") ?? 0
        let plansComplete = call.getInt("plansComplete") ?? 0
        let totalPlans = call.getInt("totalPlans") ?? 0
        let unreadNotifications = call.getInt("unreadNotifications") ?? 0

        // Store in App Group shared container for widget access
        if let sharedDefaults = UserDefaults(suiteName: appGroupId) {
            let widgetData: [String: Any] = [
                "tasksCompleted": tasksCompleted,
                "tasksTotal": tasksTotal,
                "streakCount": streak,
                "totalCompleted": totalCompleted,
                "completionRate": completionRate,
                "plansComplete": plansComplete,
                "totalPlans": totalPlans,
                "unreadNotifications": unreadNotifications,
                "lastUpdated": Date().timeIntervalSince1970
            ]

            if let jsonData = try? JSONSerialization.data(withJSONObject: widgetData),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                sharedDefaults.set(jsonString, forKey: "widget_data")
                sharedDefaults.set(Date(), forKey: "widget_data_timestamp")
                sharedDefaults.synchronize()
            }

            print("[BackgroundService] Widget data updated")
        }

        call.resolve(["success": true])
    }

    @objc func refreshWidgets(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
            print("[BackgroundService] Widgets refreshed")
        }
        call.resolve(["success": true])
    }

    // MARK: - Status

    @objc func getStatus(_ call: CAPPluginCall) {
        let syncEnabled = prefs.bool(forKey: "background_sync_enabled")
        let syncInterval = prefs.integer(forKey: "sync_interval_minutes")
        let reminderMinutes = prefs.integer(forKey: "reminder_lead_time")
        let hasCredentials = prefs.string(forKey: "auth_token") != nil

        call.resolve([
            "backgroundSyncEnabled": syncEnabled,
            "syncIntervalMinutes": syncInterval > 0 ? syncInterval : 60,
            "reminderMinutesBefore": reminderMinutes > 0 ? reminderMinutes : 30,
            "hasCredentials": hasCredentials
        ])
    }

    // MARK: - Notifications

    @objc func showNotification(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? "JournalMate"
        let body = call.getString("body") ?? ""
        let id = call.getInt("id") ?? Int(Date().timeIntervalSince1970)
        let category = call.getString("category")
        let route = call.getString("route")

        // Trigger haptic if requested
        if let hapticType = call.getString("haptic") {
            triggerHapticFeedback(type: hapticType)
        }

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        if let cat = category {
            content.categoryIdentifier = cat
        }

        var userInfo: [String: Any] = ["notificationId": id]
        if let r = route { userInfo["route"] = r }
        content.userInfo = userInfo

        // Show after 1 second
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: "bg_notification_\(id)",
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("[BackgroundService] Notification failed: \(error.localizedDescription)")
                call.resolve(["success": false, "error": error.localizedDescription])
            } else {
                print("[BackgroundService] Notification shown: \(id)")
                call.resolve(["success": true, "id": id])
            }
        }
    }

    // MARK: - Haptics

    @objc func triggerHaptic(_ call: CAPPluginCall) {
        let type = call.getString("type") ?? "medium"
        triggerHapticFeedback(type: type)
        call.resolve(["success": true])
    }

    private func triggerHapticFeedback(type: String) {
        DispatchQueue.main.async {
            switch type {
            case "light":
                let generator = UIImpactFeedbackGenerator(style: .light)
                generator.impactOccurred()
            case "medium":
                let generator = UIImpactFeedbackGenerator(style: .medium)
                generator.impactOccurred()
            case "heavy":
                let generator = UIImpactFeedbackGenerator(style: .heavy)
                generator.impactOccurred()
            case "celebration":
                // Multi-burst pattern
                let delays: [TimeInterval] = [0, 0.1, 0.2, 0.35]
                let styles: [UIImpactFeedbackGenerator.Style] = [.light, .medium, .heavy, .heavy]
                for (index, delay) in delays.enumerated() {
                    DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                        let gen = UIImpactFeedbackGenerator(style: styles[index])
                        gen.impactOccurred()
                    }
                }
            case "urgent":
                for i in 0..<3 {
                    DispatchQueue.main.asyncAfter(deadline: .now() + Double(i) * 0.15) {
                        let gen = UIImpactFeedbackGenerator(style: .heavy)
                        gen.impactOccurred()
                    }
                }
            default:
                let generator = UIImpactFeedbackGenerator(style: .medium)
                generator.impactOccurred()
            }
        }
    }

    // MARK: - Cancel Notification

    @objc func cancelNotification(_ call: CAPPluginCall) {
        let id = call.getInt("id") ?? 0
        let identifier = "bg_notification_\(id)"

        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [identifier])
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: [identifier])

        print("[BackgroundService] Notification cancelled: \(id)")
        call.resolve(["success": true])
    }
}
