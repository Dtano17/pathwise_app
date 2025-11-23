# Home Screen Widget Implementation Guide

## Overview
This guide explains how to implement native home screen widgets for JournalMate on iOS and Android. Widgets display today's tasks, streak count, and provide a quick journal entry button without opening the full app.

## Prerequisites
- Capacitor project set up (already done)
- Native Android/iOS development environment
- Access to Android Studio (for Android) and Xcode (for iOS)

## Widget Features
- **Today's Tasks**: Display up to 3 upcoming tasks with completion status
- **Streak Counter**: Show current activity completion streak
- **Quick Actions**: One-tap journal entry button that deep-links into the app
- **Auto-refresh**: Update widget data every 15-30 minutes
- **Tap to Open**: Tapping the widget opens JournalMate to the relevant screen

## Implementation Steps

### Step 1: Android Widget (Kotlin)

**1.1 Create Widget Layout** (`android/app/src/main/res/layout/widget_layout.xml`)
```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/widget_background"
    android:orientation="vertical"
    android:padding="16dp">

    <!-- Header -->
    <TextView
        android:id="@+id/widget_title"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="JournalMate"
        android:textSize="18sp"
        android:textStyle="bold"
        android:textColor="#FFFFFF"/>

    <!-- Streak Counter -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:orientation="horizontal">
        <TextView
            android:id="@+id/streak_count"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="🔥 0"
            android:textSize="16sp"
            android:textColor="#FFFFFF"/>
        <TextView
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text=" day streak"
            android:textSize="14sp"
            android:textColor="#CCCCCC"
            android:layout_marginStart="4dp"/>
    </LinearLayout>

    <!-- Tasks List -->
    <ListView
        android:id="@+id/tasks_list"
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:layout_marginTop="12dp"
        android:divider="@null"/>

    <!-- Quick Journal Button -->
    <Button
        android:id="@+id/quick_journal_btn"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:text="+ Quick Journal"
        android:backgroundTint="#8B5CF6"/>
</LinearLayout>
```

**1.2 Create Widget Provider** (`android/app/src/main/java/.../JournalMateWidget.kt`)
```kotlin
package com.journalmate.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.app.PendingIntent

class JournalMateWidget : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val views = RemoteViews(context.packageName, R.layout.widget_layout)

        // Fetch data from local storage or API
        val data = fetchWidgetData(context)
        
        // Update streak count
        views.setTextViewText(R.id.streak_count, "🔥 ${data.streakCount}")
        
        // Update tasks (using RemoteViewsService for ListView)
        val intent = Intent(context, WidgetTasksService::class.java)
        views.setRemoteAdapter(R.id.tasks_list, intent)
        
        // Set up quick journal button click
        val journalIntent = Intent(context, MainActivity::class.java).apply {
            action = "QUICK_JOURNAL"
        }
        val pendingIntent = PendingIntent.getActivity(
            context, 0, journalIntent, 
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.quick_journal_btn, pendingIntent)
        
        // Tap widget to open app
        val openIntent = Intent(context, MainActivity::class.java)
        val openPendingIntent = PendingIntent.getActivity(
            context, 1, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_title, openPendingIntent)

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun fetchWidgetData(context: Context): WidgetData {
        // Read from SharedPreferences or database
        val prefs = context.getSharedPreferences("journalmate_widget", Context.MODE_PRIVATE)
        return WidgetData(
            streakCount = prefs.getInt("streak_count", 0),
            tasks = loadTasks(prefs)
        )
    }
}

data class WidgetData(
    val streakCount: Int,
    val tasks: List<Task>
)

data class Task(
    val id: String,
    val title: String,
    val completed: Boolean
)
```

**1.3 Create Widget Configuration** (`android/app/src/main/res/xml/widget_info.xml`)
```xml
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_layout"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"/>
```

**1.4 Register in AndroidManifest.xml**
```xml
<receiver android:name=".JournalMateWidget"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/widget_info" />
</receiver>
```

### Step 2: iOS Widget (Swift/SwiftUI)

**2.1 Add Widget Extension**
1. Open Xcode project: `ios/App/App.xcworkspace`
2. File → New → Target → Widget Extension
3. Name it "JournalMateWidget"

**2.2 Create Widget View** (`JournalMateWidget/JournalMateWidget.swift`)
```swift
import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> WidgetEntry {
        WidgetEntry(date: Date(), tasks: [], streakCount: 0)
    }

    func getSnapshot(in context: Context, completion: @escaping (WidgetEntry) -> ()) {
        let entry = loadWidgetData()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetEntry>) -> ()) {
        let entry = loadWidgetData()
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
    }
    
    func loadWidgetData() -> WidgetEntry {
        // Load from App Group shared container
        if let sharedDefaults = UserDefaults(suiteName: "group.com.journalmate.app") {
            let streakCount = sharedDefaults.integer(forKey: "streakCount")
            let tasksData = sharedDefaults.array(forKey: "tasks") as? [[String: Any]] ?? []
            
            let tasks = tasksData.map { dict in
                Task(
                    id: dict["id"] as? String ?? "",
                    title: dict["title"] as? String ?? "",
                    completed: dict["completed"] as? Bool ?? false
                )
            }
            
            return WidgetEntry(date: Date(), tasks: Array(tasks.prefix(3)), streakCount: streakCount)
        }
        
        return WidgetEntry(date: Date(), tasks: [], streakCount: 0)
    }
}

struct WidgetEntry: TimelineEntry {
    let date: Date
    let tasks: [Task]
    let streakCount: Int
}

struct Task {
    let id: String
    let title: String
    let completed: Bool
}

struct JournalMateWidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
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
                Text("🔥 \\(entry.streakCount)")
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
                ForEach(entry.tasks, id: \\.id) { task in
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

@main
struct JournalMateWidget: Widget {
    let kind: String = "JournalMateWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            JournalMateWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("JournalMate")
        .description("Track your tasks and streak")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
```

**2.3 Configure App Groups** (for data sharing between app and widget)
1. In Xcode, select the main app target
2. Go to "Signing & Capabilities"
3. Add "App Groups" capability
4. Create group: `group.com.journalmate.app`
5. Do the same for the widget target

### Step 3: Update Widget Data from JavaScript

Create a Capacitor plugin bridge to update widget data:

**File: `client/src/lib/widgetManager.ts`**
```typescript
import { Preferences } from '@capacitor/preferences';
import { isIOS, isAndroid } from './platform';

export interface WidgetData {
  streakCount: number;
  tasks: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
}

/**
 * Update widget data (will be read by native widget)
 */
export async function updateWidgetData(data: WidgetData): Promise<void> {
  if (isIOS()) {
    // Store in App Group shared container (requires native plugin)
    // For now, use Capacitor Preferences as a simple implementation
    await Preferences.set({
      key: 'widget_data',
      value: JSON.stringify(data)
    });
    
    // Trigger widget reload (requires native implementation)
    // WidgetCenter.reloadTimelines() - call via plugin
  } else if (isAndroid()) {
    // Store in SharedPreferences (accessible by widget)
    await Preferences.set({
      key: 'widget_data',
      value: JSON.stringify(data)
    });
    
    // Send broadcast to update widget (requires native implementation)
  }
}

/**
 * Auto-update widget when tasks or streak changes
 */
export async function autoUpdateWidget(): Promise<void> {
  // This should be called whenever tasks or streak count changes
  // For example, in your task completion handler:
  
  // Get latest data from your app state
  const streakCount = 5; // Get from your state management
  const tasks = [
    { id: '1', title: 'Complete workout', completed: false },
    { id: '2', title: 'Journal entry', completed: true },
    { id: '3', title: 'Read 30 pages', completed: false },
  ];
  
  await updateWidgetData({ streakCount, tasks });
}
```

## Testing

### Android
1. Build and run the app on a device/emulator
2. Long-press on home screen → Widgets
3. Find JournalMate widget and add it
4. Verify data updates when you complete tasks in the app

### iOS
1. Build and run the app on a device/simulator
2. Long-press on home screen → tap '+' icon
3. Search for JournalMate widget
4. Add to home screen
5. Verify data updates

## Deep Linking

To handle widget tap actions (e.g., "Quick Journal" button):

**Add to `capacitor.config.ts`:**
```typescript
const config: CapacitorConfig = {
  appId: 'com.journalmate.app',
  appName: 'JournalMate',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    App: {
      deepLinkScheme: 'journalmate'
    }
  }
};
```

**Handle deep links in your app:**
```typescript
import { App } from '@capacitor/app';

App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
  const url = event.url;
  
  if (url.includes('journal/new')) {
    // Navigate to journal entry page
    window.location.href = '/journal/new';
  }
});
```

## Refresh Strategy

Widgets should refresh data:
- Every 15-30 minutes (automatic)
- When app comes to foreground
- When tasks are completed
- When streak updates

Implement in your app's lifecycle hooks:

```typescript
import { App } from '@capacitor/app';
import { autoUpdateWidget } from '@/lib/widgetManager';

App.addListener('appStateChange', ({ isActive }) => {
  if (isActive) {
    autoUpdateWidget();
  }
});
```

## Production Considerations

1. **Performance**: Keep widget data lightweight (max 3 tasks)
2. **Battery**: Limit update frequency to 30 minutes minimum
3. **Permissions**: No special permissions needed for widgets
4. **Size**: Test all widget sizes (small, medium, large on Android)
5. **Localization**: Support multiple languages in widget text

## Next Steps

1. Implement native widget code in Android Studio and Xcode
2. Create Capacitor plugin for widget data updates (optional but recommended)
3. Add deep linking for widget tap actions
4. Test on physical devices
5. Submit to App Store / Play Store with widget screenshots

## Resources

- [Android App Widgets Guide](https://developer.android.com/guide/topics/appwidgets)
- [iOS WidgetKit Documentation](https://developer.apple.com/documentation/widgetkit)
- [Capacitor Deep Linking](https://capacitorjs.com/docs/guides/deep-links)
