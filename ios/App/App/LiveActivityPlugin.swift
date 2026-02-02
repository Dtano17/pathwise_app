import Foundation
import Capacitor

#if canImport(ActivityKit)
import ActivityKit
#endif

@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveActivityPlugin"
    public let jsName = "LiveActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startDailyProgress", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startFocusTimer", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "updateProgress", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endActivity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endAllActivities", returnType: CAPPluginReturnPromise)
    ]

    private var currentActivityId: String?

    @objc func isSupported(_ call: CAPPluginCall) {
        if #available(iOS 16.1, *) {
            let isEnabled = ActivityAuthorizationInfo().areActivitiesEnabled
            call.resolve(["supported": true, "enabled": isEnabled])
        } else {
            call.resolve(["supported": false, "enabled": false])
        }
    }

    @objc func startDailyProgress(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.reject("Live Activities require iOS 16.1+")
            return
        }

        let tasksCompleted = call.getInt("tasksCompleted") ?? 0
        let tasksTotal = call.getInt("tasksTotal") ?? 0
        let streakCount = call.getInt("streakCount") ?? 0
        let currentTask = call.getString("currentTask")

        if let activity = LiveActivityManager.shared.startDailyProgressActivity(
            tasksCompleted: tasksCompleted,
            tasksTotal: tasksTotal,
            streakCount: streakCount,
            currentTask: currentTask
        ) {
            currentActivityId = activity.id
            call.resolve(["activityId": activity.id])
        } else {
            call.reject("Failed to start Live Activity")
        }
    }

    @objc func startFocusTimer(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.reject("Live Activities require iOS 16.1+")
            return
        }

        let durationMinutes = call.getInt("durationMinutes") ?? 25
        let taskTitle = call.getString("taskTitle") ?? "Focus Time"
        let streakCount = call.getInt("streakCount") ?? 0

        let duration = TimeInterval(durationMinutes * 60)

        if let activity = LiveActivityManager.shared.startFocusTimerActivity(
            duration: duration,
            taskTitle: taskTitle,
            streakCount: streakCount
        ) {
            currentActivityId = activity.id
            call.resolve(["activityId": activity.id])
        } else {
            call.reject("Failed to start Focus Timer")
        }
    }

    @objc func updateProgress(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.reject("Live Activities require iOS 16.1+")
            return
        }

        let tasksCompleted = call.getInt("tasksCompleted") ?? 0
        let tasksTotal = call.getInt("tasksTotal") ?? 0
        let streakCount = call.getInt("streakCount") ?? 0
        let currentTask = call.getString("currentTask")

        Task {
            for activity in Activity<JournalMateActivityAttributes>.activities {
                await LiveActivityManager.shared.updateActivity(
                    activity,
                    tasksCompleted: tasksCompleted,
                    tasksTotal: tasksTotal,
                    streakCount: streakCount,
                    currentTask: currentTask
                )
            }
            call.resolve()
        }
    }

    @objc func endActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.reject("Live Activities require iOS 16.1+")
            return
        }

        let activityId = call.getString("activityId") ?? currentActivityId

        Task {
            for activity in Activity<JournalMateActivityAttributes>.activities {
                if activityId == nil || activity.id == activityId {
                    await LiveActivityManager.shared.endActivity(activity)
                }
            }
            currentActivityId = nil
            call.resolve()
        }
    }

    @objc func endAllActivities(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.reject("Live Activities require iOS 16.1+")
            return
        }

        Task {
            await LiveActivityManager.shared.endAllActivities()
            currentActivityId = nil
            call.resolve()
        }
    }
}
