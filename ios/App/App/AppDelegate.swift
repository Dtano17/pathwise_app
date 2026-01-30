import UIKit
import Capacitor
import Firebase
import FirebaseMessaging
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {

    var window: UIWindow?

    private let apiBaseURL = "https://journalmate.ai"
    private let prefsName = "journalmate_prefs"

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Configure Firebase
        FirebaseApp.configure()

        // Set up notification delegate
        UNUserNotificationCenter.current().delegate = self

        // Set up Firebase Messaging delegate
        Messaging.messaging().delegate = self

        // Register notification categories with action buttons
        registerNotificationCategories()

        // Request notification permissions
        requestNotificationPermissions(application)

        // Trigger launch haptic feedback (immediate, native)
        triggerLaunchHaptic()

        return true
    }

    // MARK: - Launch Haptic Feedback

    private func triggerLaunchHaptic() {
        // Check user preference for launch haptic
        let enableLaunchHaptic = UserDefaults.standard.bool(forKey: "enableLaunchHaptic")

        // Default to true if preference not set (first launch)
        let shouldTrigger = UserDefaults.standard.object(forKey: "enableLaunchHaptic") == nil || enableLaunchHaptic

        if shouldTrigger {
            // Use medium impact for app launch - feels substantial but not jarring
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.prepare()
            generator.impactOccurred()
            print("[JournalMate] Launch haptic triggered")
        }
    }

    // MARK: - Notification Permission Request

    private func requestNotificationPermissions(_ application: UIApplication) {
        let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
        UNUserNotificationCenter.current().requestAuthorization(options: authOptions) { granted, error in
            if let error = error {
                print("[JournalMate] Notification permission error: \(error.localizedDescription)")
                return
            }

            print("[JournalMate] Notification permission granted: \(granted)")

            if granted {
                DispatchQueue.main.async {
                    application.registerForRemoteNotifications()
                }
            }
        }
    }

    // MARK: - Notification Categories (Action Buttons)

    private func registerNotificationCategories() {
        // Task reminder category with actions
        let markDoneAction = UNNotificationAction(
            identifier: "MARK_DONE",
            title: "Done",
            options: []
        )
        let snoozeAction = UNNotificationAction(
            identifier: "SNOOZE",
            title: "Snooze 1hr",
            options: []
        )
        let taskCategory = UNNotificationCategory(
            identifier: "TASK_REMINDER",
            actions: [markDoneAction, snoozeAction],
            intentIdentifiers: [],
            options: []
        )

        // Activity reminder category
        let viewAction = UNNotificationAction(
            identifier: "VIEW",
            title: "View",
            options: [.foreground]
        )
        let activityCategory = UNNotificationCategory(
            identifier: "ACTIVITY_REMINDER",
            actions: [viewAction],
            intentIdentifiers: [],
            options: []
        )

        // Group notification category
        let acceptAction = UNNotificationAction(
            identifier: "ACCEPT",
            title: "Accept",
            options: [.foreground]
        )
        let declineAction = UNNotificationAction(
            identifier: "DECLINE",
            title: "Decline",
            options: [.destructive]
        )
        let groupCategory = UNNotificationCategory(
            identifier: "GROUP_INVITE",
            actions: [acceptAction, declineAction],
            intentIdentifiers: [],
            options: []
        )

        // Streak warning category
        let openAppAction = UNNotificationAction(
            identifier: "OPEN_APP",
            title: "Open App",
            options: [.foreground]
        )
        let remindLaterAction = UNNotificationAction(
            identifier: "REMIND_LATER",
            title: "Remind Later",
            options: []
        )
        let streakCategory = UNNotificationCategory(
            identifier: "STREAK_WARNING",
            actions: [openAppAction, remindLaterAction],
            intentIdentifiers: [],
            options: []
        )

        // Register all categories
        UNUserNotificationCenter.current().setNotificationCategories([
            taskCategory,
            activityCategory,
            groupCategory,
            streakCategory
        ])

        print("[JournalMate] Notification categories registered")
    }

    // MARK: - APNs Token Registration

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        print("[JournalMate] APNs token received")

        // Pass token to Firebase Messaging
        Messaging.messaging().apnsToken = deviceToken
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("[JournalMate] Failed to register for remote notifications: \(error.localizedDescription)")
    }

    // MARK: - Firebase Messaging Delegate

    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let token = fcmToken else {
            print("[JournalMate] FCM token is nil")
            return
        }

        print("[JournalMate] FCM token received: \(token)")

        // Store token locally
        UserDefaults.standard.set(token, forKey: "fcmToken")

        // Send token to server
        sendTokenToServer(token)

        // Post notification for any observers in the app
        NotificationCenter.default.post(
            name: Notification.Name("FCMToken"),
            object: nil,
            userInfo: ["token": token]
        )
    }

    // MARK: - Send Token to Server

    private func sendTokenToServer(_ token: String) {
        // Get userId from shared preferences (set by Capacitor app)
        guard let userId = UserDefaults.standard.string(forKey: "userId") else {
            print("[JournalMate] No userId found, cannot register token with server")
            return
        }

        guard let url = URL(string: "\(apiBaseURL)/api/user/device-token") else {
            print("[JournalMate] Invalid API URL")
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(userId, forHTTPHeaderField: "X-User-ID")
        request.timeoutInterval = 10

        let deviceName = UIDevice.current.name
        let payload: [String: Any] = [
            "token": token,
            "platform": "ios",
            "deviceName": deviceName
        ]

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        } catch {
            print("[JournalMate] Failed to serialize token payload: \(error)")
            return
        }

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("[JournalMate] Error sending token to server: \(error.localizedDescription)")
                return
            }

            if let httpResponse = response as? HTTPURLResponse {
                if httpResponse.statusCode == 200 || httpResponse.statusCode == 201 {
                    print("[JournalMate] Token successfully registered with server")
                } else {
                    print("[JournalMate] Failed to register token. Response code: \(httpResponse.statusCode)")
                }
            }
        }.resume()
    }

    // MARK: - UNUserNotificationCenterDelegate - Foreground Notifications

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        let userInfo = notification.request.content.userInfo
        print("[JournalMate] Notification received in foreground: \(userInfo)")

        // Show notification even when app is in foreground
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .badge, .sound])
        } else {
            completionHandler([.alert, .badge, .sound])
        }
    }

    // MARK: - UNUserNotificationCenterDelegate - Notification Tap/Action

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        let actionIdentifier = response.actionIdentifier

        print("[JournalMate] Notification action: \(actionIdentifier)")
        print("[JournalMate] Notification userInfo: \(userInfo)")

        // Handle notification actions
        switch actionIdentifier {
        case "MARK_DONE":
            handleMarkDoneAction(userInfo: userInfo)
        case "SNOOZE":
            handleSnoozeAction(userInfo: userInfo)
        case "VIEW", "OPEN_APP", UNNotificationDefaultActionIdentifier:
            handleOpenAppAction(userInfo: userInfo)
        case "ACCEPT":
            handleAcceptAction(userInfo: userInfo)
        case "DECLINE":
            handleDeclineAction(userInfo: userInfo)
        case "REMIND_LATER":
            handleRemindLaterAction(userInfo: userInfo)
        default:
            break
        }

        completionHandler()
    }

    // MARK: - Notification Action Handlers

    private func handleMarkDoneAction(userInfo: [AnyHashable: Any]) {
        guard let taskId = userInfo["taskId"] as? String else { return }
        print("[JournalMate] Marking task as done: \(taskId)")
        // The app will handle this via deep link when opened
        openAppWithRoute("tasks/\(taskId)/complete")
    }

    private func handleSnoozeAction(userInfo: [AnyHashable: Any]) {
        guard let taskId = userInfo["taskId"] as? String else { return }
        print("[JournalMate] Snoozing task: \(taskId)")
        // Schedule a new notification for 1 hour later
        scheduleSnoozeNotification(userInfo: userInfo, delayMinutes: 60)
    }

    private func handleOpenAppAction(userInfo: [AnyHashable: Any]) {
        if let route = userInfo["route"] as? String {
            openAppWithRoute(route)
        } else if let activityId = userInfo["activityId"] as? String {
            openAppWithRoute("activities/\(activityId)")
        }
    }

    private func handleAcceptAction(userInfo: [AnyHashable: Any]) {
        if let groupId = userInfo["groupId"] as? String {
            openAppWithRoute("groups/\(groupId)/accept")
        }
    }

    private func handleDeclineAction(userInfo: [AnyHashable: Any]) {
        print("[JournalMate] Group invite declined")
        // No navigation needed for decline
    }

    private func handleRemindLaterAction(userInfo: [AnyHashable: Any]) {
        // Schedule reminder for 2 hours later
        scheduleSnoozeNotification(userInfo: userInfo, delayMinutes: 120)
    }

    private func openAppWithRoute(_ route: String) {
        if let url = URL(string: "journalmate://\(route)") {
            DispatchQueue.main.async {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
        }
    }

    private func scheduleSnoozeNotification(userInfo: [AnyHashable: Any], delayMinutes: Int) {
        let content = UNMutableNotificationContent()
        content.title = userInfo["title"] as? String ?? "Reminder"
        content.body = userInfo["body"] as? String ?? "You snoozed this reminder"
        content.sound = .default
        content.userInfo = userInfo

        if let categoryId = userInfo["categoryId"] as? String {
            content.categoryIdentifier = categoryId
        }

        let trigger = UNTimeIntervalNotificationTrigger(
            timeInterval: TimeInterval(delayMinutes * 60),
            repeats: false
        )

        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("[JournalMate] Failed to schedule snooze notification: \(error)")
            } else {
                print("[JournalMate] Snooze notification scheduled for \(delayMinutes) minutes")
            }
        }
    }

    // MARK: - App Lifecycle

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused while the application was inactive.
        // Clear badge count when app becomes active
        UIApplication.shared.applicationIconBadgeNumber = 0
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate.
    }

    // MARK: - URL Handling (Deep Links)

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    // MARK: - Universal Links

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
