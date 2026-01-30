import AppIntents
import Foundation

// MARK: - App Shortcuts Provider

@available(iOS 16.0, *)
struct JournalMateShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AddTaskIntent(),
            phrases: [
                "Add a task to \(.applicationName)",
                "Create a task in \(.applicationName)",
                "New task in \(.applicationName)",
                "Add to my \(.applicationName) tasks"
            ],
            shortTitle: "Add Task",
            systemImageName: "plus.circle.fill"
        )

        AppShortcut(
            intent: QuickJournalIntent(),
            phrases: [
                "Start a journal entry in \(.applicationName)",
                "Open \(.applicationName) journal",
                "Quick journal in \(.applicationName)",
                "Write in my \(.applicationName)"
            ],
            shortTitle: "Quick Journal",
            systemImageName: "square.and.pencil"
        )

        AppShortcut(
            intent: ShowStreakIntent(),
            phrases: [
                "Show my \(.applicationName) streak",
                "What's my streak in \(.applicationName)",
                "Check my \(.applicationName) progress",
                "How am I doing in \(.applicationName)"
            ],
            shortTitle: "Show Streak",
            systemImageName: "flame.fill"
        )

        AppShortcut(
            intent: ShowTodayTasksIntent(),
            phrases: [
                "Show today's tasks in \(.applicationName)",
                "What are my \(.applicationName) tasks for today",
                "My tasks today in \(.applicationName)"
            ],
            shortTitle: "Today's Tasks",
            systemImageName: "checklist"
        )
    }
}

// MARK: - Add Task Intent

@available(iOS 16.0, *)
struct AddTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Add Task"
    static var description = IntentDescription("Add a new task to JournalMate")
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Task Name", description: "What do you need to do?")
    var taskName: String

    @Parameter(title: "Due Date", description: "When is this task due?")
    var dueDate: Date?

    static var parameterSummary: some ParameterSummary {
        Summary("Add task: \(\.$taskName)") {
            \.$dueDate
        }
    }

    func perform() async throws -> some IntentResult & OpensIntent {
        // Encode task data for deep link
        var urlComponents = URLComponents(string: "journalmate://tasks/new")!
        var queryItems = [URLQueryItem(name: "title", value: taskName)]

        if let date = dueDate {
            let formatter = ISO8601DateFormatter()
            queryItems.append(URLQueryItem(name: "dueDate", value: formatter.string(from: date)))
        }

        urlComponents.queryItems = queryItems

        // Store in shared container for the app to pick up
        if let sharedDefaults = UserDefaults(suiteName: "group.com.journalmate.app") {
            let taskData: [String: Any] = [
                "title": taskName,
                "dueDate": dueDate?.timeIntervalSince1970 ?? 0,
                "createdAt": Date().timeIntervalSince1970
            ]
            if let jsonData = try? JSONSerialization.data(withJSONObject: taskData),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                sharedDefaults.set(jsonString, forKey: "pending_task")
                sharedDefaults.synchronize()
            }
        }

        return .result(opensIntent: OpenURLIntent(urlComponents.url!))
    }
}

// MARK: - Quick Journal Intent

@available(iOS 16.0, *)
struct QuickJournalIntent: AppIntent {
    static var title: LocalizedStringResource = "Quick Journal"
    static var description = IntentDescription("Start a new journal entry in JournalMate")
    static var openAppWhenRun: Bool = true

    @Parameter(title: "Initial Text", description: "Start your journal entry with...")
    var initialText: String?

    @Parameter(title: "Mood", description: "How are you feeling?")
    var mood: JournalMood?

    static var parameterSummary: some ParameterSummary {
        Summary("Start journal entry") {
            \.$initialText
            \.$mood
        }
    }

    func perform() async throws -> some IntentResult & OpensIntent {
        var urlComponents = URLComponents(string: "journalmate://journal/new")!
        var queryItems: [URLQueryItem] = []

        if let text = initialText {
            queryItems.append(URLQueryItem(name: "text", value: text))
        }

        if let mood = mood {
            queryItems.append(URLQueryItem(name: "mood", value: mood.rawValue))
        }

        if !queryItems.isEmpty {
            urlComponents.queryItems = queryItems
        }

        return .result(opensIntent: OpenURLIntent(urlComponents.url!))
    }
}

// MARK: - Show Streak Intent

@available(iOS 16.0, *)
struct ShowStreakIntent: AppIntent {
    static var title: LocalizedStringResource = "Show Streak"
    static var description = IntentDescription("Check your current streak and progress in JournalMate")

    func perform() async throws -> some IntentResult & ProvidesDialog {
        // Load streak data from shared container
        if let sharedDefaults = UserDefaults(suiteName: "group.com.journalmate.app"),
           let dataString = sharedDefaults.string(forKey: "widget_data"),
           let data = dataString.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {

            let streakCount = json["streakCount"] as? Int ?? 0
            let tasksCompleted = json["tasksCompleted"] as? Int ?? 0
            let tasksTotal = json["tasksTotal"] as? Int ?? 0
            let totalCompleted = json["totalCompleted"] as? Int ?? 0

            let message: String
            if streakCount > 0 {
                message = "You're on a \(streakCount)-day streak! Today you've completed \(tasksCompleted) of \(tasksTotal) tasks. You've completed \(totalCompleted) activities total. Keep it up!"
            } else {
                message = "Start your streak today! You have \(tasksTotal) tasks waiting. Let's get productive!"
            }

            return .result(dialog: IntentDialog(stringLiteral: message))
        }

        return .result(dialog: "Open JournalMate to see your progress and start building your streak!")
    }
}

// MARK: - Show Today's Tasks Intent

@available(iOS 16.0, *)
struct ShowTodayTasksIntent: AppIntent {
    static var title: LocalizedStringResource = "Today's Tasks"
    static var description = IntentDescription("See your tasks for today in JournalMate")
    static var openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult & ProvidesDialog & OpensIntent {
        // Load tasks from shared container
        if let sharedDefaults = UserDefaults(suiteName: "group.com.journalmate.app"),
           let dataString = sharedDefaults.string(forKey: "widget_data"),
           let data = dataString.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {

            let tasksArray = json["tasks"] as? [[String: Any]] ?? []
            let tasksCompleted = json["tasksCompleted"] as? Int ?? 0
            let tasksTotal = json["tasksTotal"] as? Int ?? 0

            if tasksArray.isEmpty {
                return .result(
                    dialog: "You have no tasks for today. Great job staying on top of things!",
                    opensIntent: OpenURLIntent(URL(string: "journalmate://tasks")!)
                )
            }

            let pendingTasks = tasksArray.filter { !($0["completed"] as? Bool ?? false) }
            let taskNames = pendingTasks.prefix(3).compactMap { $0["title"] as? String }

            var message = "You have \(tasksCompleted) of \(tasksTotal) tasks completed today."
            if !taskNames.isEmpty {
                message += " Pending: \(taskNames.joined(separator: ", "))"
                if pendingTasks.count > 3 {
                    message += " and \(pendingTasks.count - 3) more."
                }
            }

            return .result(
                dialog: IntentDialog(stringLiteral: message),
                opensIntent: OpenURLIntent(URL(string: "journalmate://tasks")!)
            )
        }

        return .result(
            dialog: "Open JournalMate to see your tasks!",
            opensIntent: OpenURLIntent(URL(string: "journalmate://tasks")!)
        )
    }
}

// MARK: - Journal Mood Enum

@available(iOS 16.0, *)
enum JournalMood: String, AppEnum {
    case happy = "happy"
    case calm = "calm"
    case neutral = "neutral"
    case anxious = "anxious"
    case sad = "sad"
    case energetic = "energetic"
    case tired = "tired"
    case grateful = "grateful"

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Mood"

    static var caseDisplayRepresentations: [JournalMood: DisplayRepresentation] = [
        .happy: DisplayRepresentation(title: "Happy", subtitle: "Feeling great", image: .init(systemName: "face.smiling")),
        .calm: DisplayRepresentation(title: "Calm", subtitle: "Peaceful and relaxed", image: .init(systemName: "leaf")),
        .neutral: DisplayRepresentation(title: "Neutral", subtitle: "Just okay", image: .init(systemName: "face.dashed")),
        .anxious: DisplayRepresentation(title: "Anxious", subtitle: "Feeling worried", image: .init(systemName: "exclamationmark.triangle")),
        .sad: DisplayRepresentation(title: "Sad", subtitle: "Feeling down", image: .init(systemName: "cloud.rain")),
        .energetic: DisplayRepresentation(title: "Energetic", subtitle: "Full of energy", image: .init(systemName: "bolt.fill")),
        .tired: DisplayRepresentation(title: "Tired", subtitle: "Need rest", image: .init(systemName: "moon.zzz")),
        .grateful: DisplayRepresentation(title: "Grateful", subtitle: "Feeling thankful", image: .init(systemName: "heart.fill"))
    ]
}

// MARK: - Open URL Intent Helper

@available(iOS 16.0, *)
struct OpenURLIntent: AppIntent {
    static var title: LocalizedStringResource = "Open URL"
    static var openAppWhenRun: Bool = true

    var url: URL

    init(_ url: URL) {
        self.url = url
    }

    init() {
        self.url = URL(string: "journalmate://")!
    }

    func perform() async throws -> some IntentResult {
        return .result()
    }
}
