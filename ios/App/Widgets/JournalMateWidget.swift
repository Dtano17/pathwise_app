import WidgetKit
import SwiftUI

// MARK: - Brand Colors (Match Android widget & Reports page)

extension Color {
    static let streakOrange = Color(red: 249/255, green: 115/255, blue: 22/255)   // #f97316 - Day Streak
    static let tasksGreen = Color(red: 16/255, green: 185/255, blue: 129/255)     // #10b981 - Tasks Done
    static let plansBlue = Color(red: 59/255, green: 130/255, blue: 246/255)      // #3b82f6 - Plans Complete
    static let ratePurple = Color(red: 168/255, green: 85/255, blue: 247/255)     // #a855f7 - Completion Rate
    static let backgroundNavy = Color(red: 11/255, green: 15/255, blue: 26/255)   // #0B0F1A
    static let brandPurple = Color(red: 108/255, green: 92/255, blue: 231/255)    // #6C5CE7
}

// MARK: - Widget Provider

struct JournalMateWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> WidgetEntry {
        WidgetEntry(
            date: Date(),
            tasks: [
                WidgetTask(id: "1", title: "Sample task", completed: false),
                WidgetTask(id: "2", title: "Another task", completed: true)
            ],
            tasksCompleted: 3,
            tasksTotal: 5,
            streakCount: 7,
            totalCompleted: 42,
            plansComplete: 3,
            completionRate: 24,
            unreadNotifications: 2
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (WidgetEntry) -> ()) {
        let entry = loadWidgetData()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetEntry>) -> ()) {
        let entry = loadWidgetData()

        // Reload widget every 15 minutes
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextRefresh))

        completion(timeline)
    }

    private func loadWidgetData() -> WidgetEntry {
        // Load from App Group shared container
        if let sharedDefaults = UserDefaults(suiteName: "group.com.journalmate.app") {
            if let dataString = sharedDefaults.string(forKey: "widget_data"),
               let data = dataString.data(using: .utf8),
               let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {

                let streakCount = json["streakCount"] as? Int ?? 0
                let tasksCompleted = json["tasksCompleted"] as? Int ?? 0
                let tasksTotal = json["tasksTotal"] as? Int ?? 0
                let totalCompleted = json["totalCompleted"] as? Int ?? 0
                let plansComplete = json["plansComplete"] as? Int ?? 0
                let completionRate = json["completionRate"] as? Int ?? 0
                let unreadNotifications = json["unreadNotifications"] as? Int ?? 0
                let tasksArray = json["tasks"] as? [[String: Any]] ?? []

                let tasks = tasksArray.compactMap { dict in
                    WidgetTask(
                        id: dict["id"] as? String ?? "",
                        title: dict["title"] as? String ?? "",
                        completed: dict["completed"] as? Bool ?? false
                    )
                }.prefix(5)

                return WidgetEntry(
                    date: Date(),
                    tasks: Array(tasks),
                    tasksCompleted: tasksCompleted,
                    tasksTotal: tasksTotal,
                    streakCount: streakCount,
                    totalCompleted: totalCompleted,
                    plansComplete: plansComplete,
                    completionRate: completionRate,
                    unreadNotifications: unreadNotifications
                )
            }
        }

        return WidgetEntry(
            date: Date(),
            tasks: [],
            tasksCompleted: 0,
            tasksTotal: 0,
            streakCount: 0,
            totalCompleted: 0,
            plansComplete: 0,
            completionRate: 0,
            unreadNotifications: 0
        )
    }
}

// MARK: - Widget Entry

struct WidgetEntry: TimelineEntry {
    let date: Date
    let tasks: [WidgetTask]
    let tasksCompleted: Int
    let tasksTotal: Int
    let streakCount: Int
    let totalCompleted: Int
    let plansComplete: Int
    let completionRate: Int
    let unreadNotifications: Int
}

struct WidgetTask: Identifiable {
    let id: String
    let title: String
    let completed: Bool
}

// MARK: - Stat Card Component

struct StatCard: View {
    let icon: String
    let value: String
    let label: String
    let color: Color
    let compact: Bool

    init(icon: String, value: String, label: String, color: Color, compact: Bool = false) {
        self.icon = icon
        self.value = value
        self.label = label
        self.color = color
        self.compact = compact
    }

    var body: some View {
        VStack(spacing: compact ? 2 : 4) {
            Image(systemName: icon)
                .font(.system(size: compact ? 12 : 14))
                .foregroundColor(color)

            Text(value)
                .font(.system(size: compact ? 14 : 16, weight: .bold))
                .foregroundColor(color)

            if !compact {
                Text(label)
                    .font(.system(size: 8))
                    .foregroundColor(.gray)
                    .textCase(.uppercase)
                    .tracking(1)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Small Widget View (2x2 equivalent)

struct SmallWidgetView: View {
    var entry: WidgetEntry

    var body: some View {
        VStack(spacing: 8) {
            // Header with app name
            HStack {
                Image(systemName: "book.closed.fill")
                    .font(.system(size: 12))
                    .foregroundColor(.brandPurple)
                Text("JournalMate")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.white)
                Spacer()
            }

            // 2x2 Stats Grid - Matches Reports page summary cards
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                StatCard(
                    icon: "flame.fill",
                    value: "\(entry.streakCount)",
                    label: "Streak",
                    color: .streakOrange,
                    compact: true
                )

                StatCard(
                    icon: "checkmark.circle.fill",
                    value: "\(entry.totalCompleted)",
                    label: "Tasks",
                    color: .tasksGreen,
                    compact: true
                )

                StatCard(
                    icon: "target",
                    value: "\(entry.plansComplete)",
                    label: "Plans",
                    color: .plansBlue,
                    compact: true
                )

                StatCard(
                    icon: "bolt.fill",
                    value: "\(entry.completionRate)%",
                    label: "Rate",
                    color: .ratePurple,
                    compact: true
                )
            }
        }
        .padding(12)
        .background(Color.backgroundNavy)
    }
}

// MARK: - Medium Widget View (4x2 equivalent)

struct MediumWidgetView: View {
    var entry: WidgetEntry

    var body: some View {
        HStack(spacing: 12) {
            // Left side: Stats
            VStack(spacing: 8) {
                HStack {
                    Image(systemName: "book.closed.fill")
                        .font(.system(size: 14))
                        .foregroundColor(.brandPurple)
                    Text("JournalMate")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(.white)
                    Spacer()
                }

                // Horizontal stats row - Matches Reports page summary cards
                HStack(spacing: 12) {
                    StatCard(
                        icon: "flame.fill",
                        value: "\(entry.streakCount)",
                        label: "Streak",
                        color: .streakOrange,
                        compact: true
                    )

                    StatCard(
                        icon: "checkmark.circle.fill",
                        value: "\(entry.totalCompleted)",
                        label: "Tasks",
                        color: .tasksGreen,
                        compact: true
                    )

                    StatCard(
                        icon: "target",
                        value: "\(entry.plansComplete)",
                        label: "Plans",
                        color: .plansBlue,
                        compact: true
                    )

                    StatCard(
                        icon: "bolt.fill",
                        value: "\(entry.completionRate)%",
                        label: "Rate",
                        color: .ratePurple,
                        compact: true
                    )
                }

                Spacer()

                // Quick Journal Button
                Link(destination: URL(string: "journalmate://journal/new")!) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 12))
                        Text("Quick Journal")
                            .font(.system(size: 11, weight: .medium))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.brandPurple)
                    .cornerRadius(8)
                }
            }

            Divider()
                .background(Color.white.opacity(0.2))

            // Right side: Task List
            VStack(alignment: .leading, spacing: 4) {
                Text("TODAY'S TASKS")
                    .font(.system(size: 8, weight: .semibold))
                    .foregroundColor(.gray)
                    .tracking(1)

                if entry.tasks.isEmpty {
                    Spacer()
                    Text("No tasks")
                        .font(.system(size: 11))
                        .foregroundColor(.gray)
                        .italic()
                    Spacer()
                } else {
                    ForEach(entry.tasks.prefix(4)) { task in
                        HStack(spacing: 6) {
                            Image(systemName: task.completed ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 10))
                                .foregroundColor(task.completed ? .tasksGreen : .gray)

                            Text(task.title)
                                .font(.system(size: 10))
                                .foregroundColor(task.completed ? .gray : .white)
                                .lineLimit(1)
                                .strikethrough(task.completed)
                        }
                    }
                }

                Spacer()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(12)
        .background(Color.backgroundNavy)
    }
}

// MARK: - Large Widget View (4x4 equivalent - new for iOS)

struct LargeWidgetView: View {
    var entry: WidgetEntry

    var completionRateDecimal: Double {
        return Double(entry.completionRate) / 100.0
    }

    var body: some View {
        VStack(spacing: 12) {
            // Header
            HStack {
                Image(systemName: "book.closed.fill")
                    .font(.system(size: 18))
                    .foregroundColor(.brandPurple)
                Text("JournalMate")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                Spacer()

                // Streak badge
                HStack(spacing: 4) {
                    Image(systemName: "flame.fill")
                        .font(.system(size: 12))
                    Text("\(entry.streakCount) day streak")
                        .font(.system(size: 11, weight: .medium))
                }
                .foregroundColor(.streakOrange)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.streakOrange.opacity(0.2))
                .cornerRadius(12)
            }

            // Progress Ring + Stats - Matches Reports page summary cards
            HStack(spacing: 20) {
                // Progress Ring
                ZStack {
                    Circle()
                        .stroke(Color.white.opacity(0.1), lineWidth: 8)

                    Circle()
                        .trim(from: 0, to: completionRateDecimal)
                        .stroke(
                            LinearGradient(
                                colors: [.brandPurple, .plansBlue],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            style: StrokeStyle(lineWidth: 8, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))

                    VStack(spacing: 2) {
                        Text("\(entry.completionRate)%")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(.white)
                        Text("complete")
                            .font(.system(size: 9))
                            .foregroundColor(.gray)
                    }
                }
                .frame(width: 80, height: 80)

                // Stats Grid
                VStack(spacing: 12) {
                    HStack(spacing: 16) {
                        StatCard(
                            icon: "checkmark.circle.fill",
                            value: "\(entry.totalCompleted)",
                            label: "Tasks",
                            color: .tasksGreen
                        )

                        StatCard(
                            icon: "target",
                            value: "\(entry.plansComplete)",
                            label: "Plans",
                            color: .plansBlue
                        )

                        StatCard(
                            icon: "bolt.fill",
                            value: "\(entry.completionRate)%",
                            label: "Rate",
                            color: .ratePurple
                        )
                    }
                }
            }

            Divider()
                .background(Color.white.opacity(0.2))

            // Task List
            VStack(alignment: .leading, spacing: 8) {
                Text("TODAY'S TASKS")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.gray)
                    .tracking(1)

                if entry.tasks.isEmpty {
                    HStack {
                        Spacer()
                        VStack(spacing: 4) {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.system(size: 24))
                                .foregroundColor(.tasksGreen)
                            Text("All caught up!")
                                .font(.system(size: 12))
                                .foregroundColor(.gray)
                        }
                        Spacer()
                    }
                    .padding(.vertical, 8)
                } else {
                    ForEach(entry.tasks.prefix(5)) { task in
                        HStack(spacing: 8) {
                            Image(systemName: task.completed ? "checkmark.circle.fill" : "circle")
                                .font(.system(size: 14))
                                .foregroundColor(task.completed ? .tasksGreen : .gray)

                            Text(task.title)
                                .font(.system(size: 12))
                                .foregroundColor(task.completed ? .gray : .white)
                                .lineLimit(1)
                                .strikethrough(task.completed)

                            Spacer()
                        }
                    }
                }
            }

            Spacer()

            // Quick Actions
            HStack(spacing: 12) {
                Link(destination: URL(string: "journalmate://journal/new")!) {
                    HStack {
                        Image(systemName: "square.and.pencil")
                            .font(.system(size: 12))
                        Text("Journal")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color.brandPurple)
                    .cornerRadius(10)
                }

                Link(destination: URL(string: "journalmate://tasks")!) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 12))
                        Text("Add Task")
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color.taskBlue)
                    .cornerRadius(10)
                }
            }
        }
        .padding(16)
        .background(Color.backgroundNavy)
    }
}

// MARK: - Lock Screen Widgets (iOS 16+)

@available(iOS 16.0, *)
struct AccessoryRectangularView: View {
    var entry: WidgetEntry

    var body: some View {
        HStack(spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                Text("JournalMate")
                    .font(.system(size: 12, weight: .semibold))

                HStack(spacing: 8) {
                    Label("\(entry.streakCount)d", systemImage: "flame")
                        .font(.system(size: 10))

                    Label("\(entry.totalCompleted)", systemImage: "checkmark.circle")
                        .font(.system(size: 10))

                    Label("\(entry.completionRate)%", systemImage: "bolt")
                        .font(.system(size: 10))
                }
            }

            Spacer()
        }
    }
}

@available(iOS 16.0, *)
struct AccessoryCircularView: View {
    var entry: WidgetEntry

    var body: some View {
        ZStack {
            AccessoryWidgetBackground()

            VStack(spacing: 0) {
                Image(systemName: "flame.fill")
                    .font(.system(size: 12))

                Text("\(entry.streakCount)")
                    .font(.system(size: 14, weight: .bold))
            }
        }
    }
}

@available(iOS 16.0, *)
struct AccessoryInlineView: View {
    var entry: WidgetEntry

    var body: some View {
        Label("\(entry.streakCount)d streak • \(entry.totalCompleted) tasks • \(entry.completionRate)%", systemImage: "book.closed.fill")
    }
}

// MARK: - Main Widget View

struct JournalMateWidgetView: View {
    var entry: JournalMateWidgetProvider.Entry
    @Environment(\.widgetFamily) var widgetFamily

    var body: some View {
        switch widgetFamily {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .systemLarge:
            LargeWidgetView(entry: entry)
        default:
            if #available(iOS 16.0, *) {
                switch widgetFamily {
                case .accessoryRectangular:
                    AccessoryRectangularView(entry: entry)
                case .accessoryCircular:
                    AccessoryCircularView(entry: entry)
                case .accessoryInline:
                    AccessoryInlineView(entry: entry)
                default:
                    SmallWidgetView(entry: entry)
                }
            } else {
                SmallWidgetView(entry: entry)
            }
        }
    }
}

// MARK: - Widget Configuration

@main
struct JournalMateWidget: Widget {
    let kind: String = "JournalMateWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: JournalMateWidgetProvider()) { entry in
            JournalMateWidgetView(entry: entry)
        }
        .configurationDisplayName("JournalMate")
        .description("Track your tasks, streaks, and progress at a glance")
        .supportedFamilies(supportedFamilies)
    }

    var supportedFamilies: [WidgetFamily] {
        if #available(iOS 16.0, *) {
            return [
                .systemSmall,
                .systemMedium,
                .systemLarge,
                .accessoryRectangular,
                .accessoryCircular,
                .accessoryInline
            ]
        } else {
            return [
                .systemSmall,
                .systemMedium,
                .systemLarge
            ]
        }
    }
}

// MARK: - Previews

#Preview("Small", as: .systemSmall) {
    JournalMateWidget()
} timeline: {
    WidgetEntry(
        date: Date(),
        tasks: [
            WidgetTask(id: "1", title: "Morning routine", completed: true),
            WidgetTask(id: "2", title: "Review emails", completed: false)
        ],
        tasksCompleted: 3,
        tasksTotal: 5,
        streakCount: 7,
        totalCompleted: 42,
        plansComplete: 3,
        completionRate: 24,
        unreadNotifications: 2
    )
}

#Preview("Medium", as: .systemMedium) {
    JournalMateWidget()
} timeline: {
    WidgetEntry(
        date: Date(),
        tasks: [
            WidgetTask(id: "1", title: "Complete morning routine", completed: true),
            WidgetTask(id: "2", title: "Review email inbox", completed: false),
            WidgetTask(id: "3", title: "Team meeting at 2pm", completed: false),
            WidgetTask(id: "4", title: "Finish project report", completed: false)
        ],
        tasksCompleted: 3,
        tasksTotal: 8,
        streakCount: 14,
        totalCompleted: 156,
        plansComplete: 8,
        completionRate: 42,
        unreadNotifications: 5
    )
}

#Preview("Large", as: .systemLarge) {
    JournalMateWidget()
} timeline: {
    WidgetEntry(
        date: Date(),
        tasks: [
            WidgetTask(id: "1", title: "Complete morning routine", completed: true),
            WidgetTask(id: "2", title: "Review email inbox", completed: true),
            WidgetTask(id: "3", title: "Team meeting at 2pm", completed: false),
            WidgetTask(id: "4", title: "Finish project report", completed: false),
            WidgetTask(id: "5", title: "Exercise for 30 minutes", completed: false)
        ],
        tasksCompleted: 5,
        tasksTotal: 8,
        streakCount: 21,
        totalCompleted: 312,
        plansComplete: 15,
        completionRate: 65,
        unreadNotifications: 3
    )
}
