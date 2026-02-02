import WidgetKit
import SwiftUI

// MARK: - Widget Provider
struct JournalMateWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> WidgetEntry {
        WidgetEntry(
            date: Date(),
            tasks: [
                WidgetTask(id: "1", title: "Sample task", completed: false),
                WidgetTask(id: "2", title: "Another task", completed: false)
            ],
            streakCount: 5
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
                let tasksArray = json["tasks"] as? [[String: Any]] ?? []
                
                let tasks = tasksArray.compactMap { dict in
                    WidgetTask(
                        id: dict["id"] as? String ?? "",
                        title: dict["title"] as? String ?? "",
                        completed: dict["completed"] as? Bool ?? false
                    )
                }.prefix(3)
                
                return WidgetEntry(
                    date: Date(),
                    tasks: Array(tasks),
                    streakCount: streakCount
                )
            }
        }
        
        return WidgetEntry(
            date: Date(),
            tasks: [],
            streakCount: 0
        )
    }
}

// MARK: - Widget Entry
struct WidgetEntry: TimelineEntry {
    let date: Date
    let tasks: [WidgetTask]
    let streakCount: Int
}

struct WidgetTask: Identifiable {
    let id: String
    let title: String
    let completed: Bool
}

// MARK: - Widget View
struct JournalMateWidgetView: View {
    var entry: JournalMateWidgetProvider.Entry
    @Environment(\.widgetFamily) var widgetFamily

    var body: some View {
        switch widgetFamily {
        case .systemSmall:
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("JournalMate")
                        .font(.headline)
                        .foregroundColor(.white)
                    Spacer()
                }
                
                HStack {
                    Text("🔥 \(entry.streakCount)")
                        .font(.title3)
                        .foregroundColor(.white)
                    Text("day")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Spacer()
                
                Link(destination: URL(string: "journalmate://journal/new")!) {
                    HStack {
                        Spacer()
                        Text("+ Journal")
                            .font(.caption)
                            .foregroundColor(.white)
                        Spacer()
                    }
                    .padding(.vertical, 6)
                    .background(Color.purple)
                    .cornerRadius(8)
                }
            }
            
        default: // systemMedium or larger
            VStack(alignment: .leading, spacing: 8) {
                // Header
                HStack {
                    Text("JournalMate")
                        .font(.headline)
                        .foregroundColor(.white)
                    Spacer()
                }
                
                // Streak Counter
                HStack {
                    Text("🔥 \(entry.streakCount)")
                        .font(.title3)
                        .foregroundColor(.white)
                    Text("day streak")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Divider()
                    .background(Color.white.opacity(0.3))
                
                // Tasks
                if entry.tasks.isEmpty {
                    Text("No tasks today")
                        .font(.caption)
                        .foregroundColor(.gray)
                        .italic()
                } else {
                    ForEach(entry.tasks) { task in
                        HStack {
                            Image(systemName: task.completed ? "checkmark.circle.fill" : "circle")
                                .foregroundColor(task.completed ? .green : .gray)
                            Text(task.title)
                                .font(.caption)
                                .foregroundColor(.white)
                                .lineLimit(1)
                            Spacer()
                        }
                    }
                }
                
                Spacer()
                
                // Quick Journal Button
                Link(destination: URL(string: "journalmate://journal/new")!) {
                    HStack {
                        Spacer()
                        Text("+ Quick Journal")
                            .font(.caption)
                            .foregroundColor(.white)
                        Spacer()
                    }
                    .padding(.vertical, 6)
                    .background(Color.purple)
                    .cornerRadius(8)
                }
            }
            .padding()
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [Color.purple, Color.blue]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
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
        .description("Track your tasks, streaks, and quick journal access")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

#Preview(as: .systemMedium) {
    JournalMateWidget()
} timeline: {
    WidgetEntry(
        date: Date(),
        tasks: [
            WidgetTask(id: "1", title: "Complete morning routine", completed: false),
            WidgetTask(id: "2", title: "Review email", completed: true),
            WidgetTask(id: "3", title: "Team meeting at 2pm", completed: false)
        ],
        streakCount: 7
    )
}
