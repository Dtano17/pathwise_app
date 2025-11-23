package ai.journalmate.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.LinearLayout
import android.widget.RemoteViews
import android.app.PendingIntent
import android.widget.TextView
import android.view.LayoutInflater
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
                val data = fetchWidgetData(context)
                
                // Update UI on main thread
                withContext(Dispatchers.Main) {
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
            } catch (error: Exception) {
                android.util.Log.e("JournalMateWidget", "Failed to update widget: ${error.message}")
            }
        }
    }

    private suspend fun fetchWidgetData(context: Context): WidgetData {
        return try {
            val userId = getDemoUserId(context)
            val url = "http://localhost:5000/api/tasks/widget"
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
            WidgetData(0, emptyList())
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
                    id = taskObj.getString("id"),
                    title = taskObj.getString("title"),
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
        val tasksContainer = LinearLayout(context)
        tasksContainer.orientation = LinearLayout.VERTICAL
        
        if (tasks.isEmpty()) {
            val emptyView = TextView(context).apply {
                text = "No tasks today"
                setTextColor(0xFFAAAAAA.toInt())
                textSize = 12f
            }
            tasksContainer.addView(emptyView)
        } else {
            tasks.forEach { task ->
                val taskView = TextView(context).apply {
                    text = "${if (task.completed) "✓" else "○"} ${task.title}"
                    setTextColor(0xFFFFFFFF.toInt())
                    textSize = 12f
                }
                tasksContainer.addView(taskView)
            }
        }
        
        views.removeAllViews(R.id.tasks_list)
        views.addView(R.id.tasks_list, tasksContainer)
    }

    private fun getDemoUserId(context: Context): String {
        val prefs = context.getSharedPreferences("journalmate", Context.MODE_PRIVATE)
        return prefs.getString("userId", "demo-user") ?: "demo-user"
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
