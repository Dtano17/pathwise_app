import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Activity Attributes

@available(iOS 16.1, *)
struct JournalMateActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic state that can update
        var tasksCompleted: Int
        var tasksTotal: Int
        var streakCount: Int
        var currentTaskTitle: String?
        var timerEndTime: Date?
        var progressMessage: String
    }

    // Fixed state set when activity starts
    var activityType: ActivityType
    var activityTitle: String
    var startTime: Date

    enum ActivityType: String, Codable {
        case dailyProgress = "daily_progress"
        case focusTimer = "focus_timer"
        case streakReminder = "streak_reminder"
        case taskCountdown = "task_countdown"
    }
}

// MARK: - Live Activity Widget

@available(iOS 16.1, *)
struct JournalMateLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: JournalMateActivityAttributes.self) { context in
            // Lock Screen / Banner UI
            LockScreenLiveActivityView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI
                DynamicIslandExpandedRegion(.leading) {
                    ExpandedLeadingView(context: context)
                }

                DynamicIslandExpandedRegion(.trailing) {
                    ExpandedTrailingView(context: context)
                }

                DynamicIslandExpandedRegion(.center) {
                    ExpandedCenterView(context: context)
                }

                DynamicIslandExpandedRegion(.bottom) {
                    ExpandedBottomView(context: context)
                }
            } compactLeading: {
                // Compact leading (left pill)
                CompactLeadingView(context: context)
            } compactTrailing: {
                // Compact trailing (right pill)
                CompactTrailingView(context: context)
            } minimal: {
                // Minimal view (when multiple activities)
                MinimalView(context: context)
            }
        }
    }
}

// MARK: - Lock Screen View

@available(iOS 16.1, *)
struct LockScreenLiveActivityView: View {
    let context: ActivityViewContext<JournalMateActivityAttributes>

    var body: some View {
        HStack(spacing: 16) {
            // Left: Progress indicator
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.2), lineWidth: 4)

                Circle()
                    .trim(from: 0, to: progressValue)
                    .stroke(Color.purple, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                    .rotationEffect(.degrees(-90))

                VStack(spacing: 0) {
                    if context.attributes.activityType == .focusTimer,
                       let endTime = context.state.timerEndTime {
                        Text(endTime, style: .timer)
                            .font(.system(size: 14, weight: .bold, design: .monospaced))
                            .foregroundColor(.white)
                    } else {
                        Text("\(context.state.tasksCompleted)")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)
                        Text("/\(context.state.tasksTotal)")
                            .font(.system(size: 10))
                            .foregroundColor(.gray)
                    }
                }
            }
            .frame(width: 50, height: 50)

            // Center: Activity info
            VStack(alignment: .leading, spacing: 4) {
                Text(context.attributes.activityTitle)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)

                if let taskTitle = context.state.currentTaskTitle {
                    Text(taskTitle)
                        .font(.system(size: 12))
                        .foregroundColor(.gray)
                        .lineLimit(1)
                }

                Text(context.state.progressMessage)
                    .font(.system(size: 11))
                    .foregroundColor(.purple)
            }

            Spacer()

            // Right: Streak
            VStack(spacing: 2) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 16))
                    .foregroundColor(.orange)

                Text("\(context.state.streakCount)")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)

                Text("days")
                    .font(.system(size: 8))
                    .foregroundColor(.gray)
            }
        }
        .padding(16)
        .background(Color.black.opacity(0.8))
    }

    var progressValue: Double {
        guard context.state.tasksTotal > 0 else { return 0 }
        return Double(context.state.tasksCompleted) / Double(context.state.tasksTotal)
    }
}

// MARK: - Dynamic Island Views

@available(iOS 16.1, *)
struct CompactLeadingView: View {
    let context: ActivityViewContext<JournalMateActivityAttributes>

    var body: some View {
        Image(systemName: "book.closed.fill")
            .font(.system(size: 14))
            .foregroundColor(.purple)
    }
}

@available(iOS 16.1, *)
struct CompactTrailingView: View {
    let context: ActivityViewContext<JournalMateActivityAttributes>

    var body: some View {
        if context.attributes.activityType == .focusTimer,
           let endTime = context.state.timerEndTime {
            Text(endTime, style: .timer)
                .font(.system(size: 12, weight: .medium, design: .monospaced))
                .foregroundColor(.white)
        } else {
            Text("\(context.state.tasksCompleted)/\(context.state.tasksTotal)")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.white)
        }
    }
}

@available(iOS 16.1, *)
struct MinimalView: View {
    let context: ActivityViewContext<JournalMateActivityAttributes>

    var body: some View {
        ZStack {
            Circle()
                .fill(Color.purple)

            if context.attributes.activityType == .focusTimer {
                Image(systemName: "timer")
                    .font(.system(size: 12))
                    .foregroundColor(.white)
            } else {
                Text("\(context.state.tasksCompleted)")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(.white)
            }
        }
    }
}

@available(iOS 16.1, *)
struct ExpandedLeadingView: View {
    let context: ActivityViewContext<JournalMateActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Image(systemName: "book.closed.fill")
                .font(.system(size: 20))
                .foregroundColor(.purple)

            Text("JournalMate")
                .font(.system(size: 10))
                .foregroundColor(.gray)
        }
    }
}

@available(iOS 16.1, *)
struct ExpandedTrailingView: View {
    let context: ActivityViewContext<JournalMateActivityAttributes>

    var body: some View {
        VStack(alignment: .trailing, spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 14))
                    .foregroundColor(.orange)

                Text("\(context.state.streakCount)")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
            }

            Text("day streak")
                .font(.system(size: 10))
                .foregroundColor(.gray)
        }
    }
}

@available(iOS 16.1, *)
struct ExpandedCenterView: View {
    let context: ActivityViewContext<JournalMateActivityAttributes>

    var body: some View {
        VStack(spacing: 4) {
            Text(context.attributes.activityTitle)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)

            if context.attributes.activityType == .focusTimer,
               let endTime = context.state.timerEndTime {
                Text(endTime, style: .timer)
                    .font(.system(size: 24, weight: .bold, design: .monospaced))
                    .foregroundColor(.purple)
            } else {
                HStack(spacing: 8) {
                    Text("\(context.state.tasksCompleted)")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.green)

                    Text("/")
                        .font(.system(size: 20))
                        .foregroundColor(.gray)

                    Text("\(context.state.tasksTotal)")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(.white)
                }
            }
        }
    }
}

@available(iOS 16.1, *)
struct ExpandedBottomView: View {
    let context: ActivityViewContext<JournalMateActivityAttributes>

    var body: some View {
        HStack(spacing: 16) {
            if let taskTitle = context.state.currentTaskTitle {
                Label(taskTitle, systemImage: "arrow.right.circle.fill")
                    .font(.system(size: 12))
                    .foregroundColor(.white)
                    .lineLimit(1)
            }

            Spacer()

            Text(context.state.progressMessage)
                .font(.system(size: 11))
                .foregroundColor(.purple)
        }
    }
}

// MARK: - Live Activity Manager (Called from main app)

@available(iOS 16.1, *)
public class LiveActivityManager {
    public static let shared = LiveActivityManager()

    private init() {}

    // Start daily progress activity
    public func startDailyProgressActivity(
        tasksCompleted: Int,
        tasksTotal: Int,
        streakCount: Int,
        currentTask: String?
    ) -> Activity<JournalMateActivityAttributes>? {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            print("[LiveActivity] Activities not enabled")
            return nil
        }

        let attributes = JournalMateActivityAttributes(
            activityType: .dailyProgress,
            activityTitle: "Daily Progress",
            startTime: Date()
        )

        let contentState = JournalMateActivityAttributes.ContentState(
            tasksCompleted: tasksCompleted,
            tasksTotal: tasksTotal,
            streakCount: streakCount,
            currentTaskTitle: currentTask,
            timerEndTime: nil,
            progressMessage: progressMessage(completed: tasksCompleted, total: tasksTotal)
        )

        do {
            let activity = try Activity.request(
                attributes: attributes,
                contentState: contentState,
                pushType: nil
            )
            print("[LiveActivity] Started daily progress activity: \(activity.id)")
            return activity
        } catch {
            print("[LiveActivity] Failed to start activity: \(error)")
            return nil
        }
    }

    // Start focus timer activity
    public func startFocusTimerActivity(
        duration: TimeInterval,
        taskTitle: String,
        streakCount: Int
    ) -> Activity<JournalMateActivityAttributes>? {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            print("[LiveActivity] Activities not enabled")
            return nil
        }

        let attributes = JournalMateActivityAttributes(
            activityType: .focusTimer,
            activityTitle: "Focus Timer",
            startTime: Date()
        )

        let endTime = Date().addingTimeInterval(duration)

        let contentState = JournalMateActivityAttributes.ContentState(
            tasksCompleted: 0,
            tasksTotal: 1,
            streakCount: streakCount,
            currentTaskTitle: taskTitle,
            timerEndTime: endTime,
            progressMessage: "Stay focused!"
        )

        do {
            let activity = try Activity.request(
                attributes: attributes,
                contentState: contentState,
                pushType: nil
            )
            print("[LiveActivity] Started focus timer activity: \(activity.id)")
            return activity
        } catch {
            print("[LiveActivity] Failed to start timer activity: \(error)")
            return nil
        }
    }

    // Update activity state
    public func updateActivity(
        _ activity: Activity<JournalMateActivityAttributes>,
        tasksCompleted: Int,
        tasksTotal: Int,
        streakCount: Int,
        currentTask: String?
    ) async {
        let contentState = JournalMateActivityAttributes.ContentState(
            tasksCompleted: tasksCompleted,
            tasksTotal: tasksTotal,
            streakCount: streakCount,
            currentTaskTitle: currentTask,
            timerEndTime: nil,
            progressMessage: progressMessage(completed: tasksCompleted, total: tasksTotal)
        )

        await activity.update(using: contentState)
        print("[LiveActivity] Updated activity: \(activity.id)")
    }

    // End activity
    public func endActivity(_ activity: Activity<JournalMateActivityAttributes>) async {
        await activity.end(dismissalPolicy: .immediate)
        print("[LiveActivity] Ended activity: \(activity.id)")
    }

    // End all activities
    public func endAllActivities() async {
        for activity in Activity<JournalMateActivityAttributes>.activities {
            await activity.end(dismissalPolicy: .immediate)
        }
        print("[LiveActivity] Ended all activities")
    }

    // Helper to generate progress message
    private func progressMessage(completed: Int, total: Int) -> String {
        let remaining = total - completed
        if remaining == 0 {
            return "All done! Great job!"
        } else if remaining == 1 {
            return "1 task left - you got this!"
        } else {
            return "\(remaining) tasks remaining"
        }
    }
}
