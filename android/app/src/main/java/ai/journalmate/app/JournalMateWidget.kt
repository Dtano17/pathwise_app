package ai.journalmate.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.app.PendingIntent
import kotlinx.coroutines.*

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

        // Fetch data from widget data API
        CoroutineScope(Dispatchers.IO).launch {
            try {
                // Try to get cached data first (fastest)
                val cachedData = getCachedWidgetData(context)
                
                // Update UI on main thread with cached data
                withContext(Dispatchers.Main) {
                    updateWidgetUI(context, views, cachedData, appWidgetManager, appWidgetId)
                }
                
                // Then try to fetch fresh data from API
                try {
                    val freshData = fetchWidgetData(context)
                    if (freshData.tasks.isNotEmpty() || freshData.streakCount > 0) {
                        withContext(Dispatchers.Main) {
                            updateWidgetUI(context, views, freshData, appWidgetManager, appWidgetId)
                        }
                    }
                } catch (e: Exception) {
                    // Ignore API errors if we have cached data
                    android.util.Log.e("JournalMateWidget", "API update failed: ${e.message}")
                }
            } catch (error: Exception) {
                android.util.Log.e("JournalMateWidget", "Failed to update widget: ${error.message}")
            }
        }
    }

    private fun updateWidgetUI(
        context: Context, 
        views: RemoteViews, 
        data: WidgetData,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        // Update streak count
        views.setTextViewText(R.id.streak_count, "🔥 ${data.streakCount}")
        
        // Update tasks
        updateTasksList(context, views, data.tasks)
        
        // Set up quick journal button
        val journalIntent = Intent(context, MainActivity::class.java).apply {
            action = "QUICK_JOURNAL"
            putExtra("tab", "journal")
        }
        val journalPendingIntent = PendingIntent.getActivity(
            context, 0, journalIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.quick_journal_btn, journalPendingIntent)
        
        // Tap widget to open app
        val openIntent = Intent(context, MainActivity::class.java)
        val openPendingIntent = PendingIntent.getActivity(
            context, 1, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_title, openPendingIntent)
        
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun getCachedWidgetData(context: Context): WidgetData {
        // Read from Capacitor Preferences (SharedPreferences named "CapacitorStorage")
        val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
        val jsonString = prefs.getString("widget_data", null)
        
        if (jsonString != null) {
            return parseWidgetData(jsonString)
        }
        return WidgetData(0, emptyList())
    }

    private suspend fun fetchWidgetData(context: Context): WidgetData {
        return try {
            val userId = getUserId(context)
            // Use production URL
            val url = "https://journalmate.replit.app/api/tasks/widget"
            val request = java.net.URL(url).openConnection() as java.net.HttpURLConnection
            request.requestMethod = "GET"
            request.setRequestProperty("User-ID", userId)
            request.connectTimeout = 5000
            request.readTimeout = 5000
            
            if (request.responseCode == 200) {
                val response = request.inputStream.bufferedReader().use { it.readText() }
                parseWidgetData(response)
            } else {
                WidgetData(0, emptyList())
            }
        } catch (error: Exception) {
            android.util.Log.e("JournalMateWidget", "Failed to fetch widget data: ${error.message}")
            throw error
        }
    }

    private fun parseWidgetData(jsonString: String): WidgetData {
        return try {
            val json = org.json.JSONObject(jsonString)
            val streakCount = json.optInt("streakCount", 0)
            val tasksArray = json.optJSONArray("tasks") ?: org.json.JSONArray()
            
            val tasks = mutableListOf<WidgetTask>()
            for (i in 0 until minOf(tasksArray.length(), 3)) {
                val taskObj = tasksArray.getJSONObject(i)
                tasks.add(WidgetTask(
                    id = taskObj.optString("id", ""),
                    title = taskObj.optString("title", "Task"),
                    completed = taskObj.optBoolean("completed", false)
                ))
            }
            
            WidgetData(streakCount, tasks)
        } catch (error: Exception) {
            android.util.Log.e("JournalMateWidget", "Failed to parse widget data: ${error.message}")
            WidgetData(0, emptyList())
        }
    }

    private fun updateTasksList(
        context: Context,
        views: RemoteViews,
        tasks: List<WidgetTask>
    ) {
        // RemoteViews requires using predefined views, not dynamic creation
        // We have 3 predefined task TextViews: task_1, task_2, task_3

        if (tasks.isEmpty()) {
            // Show empty state message
            views.setViewVisibility(R.id.tasks_empty, android.view.View.VISIBLE)
            views.setViewVisibility(R.id.task_1, android.view.View.GONE)
            views.setViewVisibility(R.id.task_2, android.view.View.GONE)
            views.setViewVisibility(R.id.task_3, android.view.View.GONE)
        } else {
            // Hide empty state
            views.setViewVisibility(R.id.tasks_empty, android.view.View.GONE)

            // Update each task TextView (max 3 tasks)
            val taskIds = listOf(R.id.task_1, R.id.task_2, R.id.task_3)

            for (i in 0..2) {
                if (i < tasks.size) {
                    val task = tasks[i]
                    val checkmark = if (task.completed) "✓" else "○"
                    views.setTextViewText(taskIds[i], "$checkmark ${task.title}")
                    views.setViewVisibility(taskIds[i], android.view.View.VISIBLE)
                } else {
                    // Hide unused task slots
                    views.setViewVisibility(taskIds[i], android.view.View.GONE)
                }
            }
        }
    }

    private fun getUserId(context: Context): String {
        // Try to get from CapacitorStorage first
        val prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
        val userId = prefs.getString("user_id", null) ?: prefs.getString("userId", null)
        return userId ?: "demo-user"
    }
}

data class WidgetData(
    val streakCount: Int,
    val tasks: List<WidgetTask>
)

data class WidgetTask(
    val id: String,
    val title: String,
    val completed: Boolean
)
