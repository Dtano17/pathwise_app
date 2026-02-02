package ai.journalmate.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import ai.journalmate.app.widgets.JournalMateWidget2x2;
import ai.journalmate.app.widgets.JournalMateWidget4x1;
import ai.journalmate.app.widgets.JournalMateWidget4x2;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Calendar;
import java.util.concurrent.TimeUnit;

/**
 * Background Worker for syncing tasks and scheduling reminders
 *
 * This runs periodically (every 15-60 minutes) to:
 * 1. Fetch upcoming tasks from the server
 * 2. Schedule precise AlarmManager reminders for due tasks
 * 3. Update the foreground service notification
 *
 * Uses WorkManager for reliable background execution even when app is closed.
 */
public class TaskSyncWorker extends Worker {
    private static final String TAG = "TaskSyncWorker";
    private static final String PREFS_NAME = "journalmate_prefs";
    private static final String BASE_URL = "https://journalmate.ai";

    public TaskSyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "TaskSyncWorker starting background sync...");

        try {
            // Get user ID from shared preferences (set by JavaScript bridge)
            SharedPreferences prefs = getApplicationContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String userId = prefs.getString("userId", null);
            String authToken = prefs.getString("authToken", null);

            if (userId == null || authToken == null) {
                Log.w(TAG, "No user credentials, skipping sync");
                return Result.success(); // Don't retry, user not logged in
            }

            // Fetch tasks from server
            JSONObject tasksData = fetchTasks(authToken);

            if (tasksData != null) {
                // Schedule reminders for upcoming tasks
                scheduleTaskReminders(tasksData);

                // Update foreground service with new data
                updateForegroundService(tasksData);

                // Refresh all home screen widgets with latest data
                refreshAllWidgets();

                Log.d(TAG, "Background sync completed successfully");
                return Result.success();
            } else {
                Log.w(TAG, "Failed to fetch tasks");
                return Result.retry(); // Try again later
            }

        } catch (Exception e) {
            Log.e(TAG, "Background sync failed: " + e.getMessage());
            return Result.retry();
        }
    }

    /**
     * Fetch tasks from the JournalMate API
     */
    private JSONObject fetchTasks(String authToken) {
        HttpURLConnection connection = null;
        try {
            URL url = new URL(BASE_URL + "/api/tasks/upcoming");
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setRequestProperty("Authorization", "Bearer " + authToken);
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(10000);

            int responseCode = connection.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {
                BufferedReader reader = new BufferedReader(
                    new InputStreamReader(connection.getInputStream())
                );
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                reader.close();

                return new JSONObject(response.toString());
            } else {
                Log.w(TAG, "API returned status: " + responseCode);
                return null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to fetch tasks: " + e.getMessage());
            return null;
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    /**
     * Schedule AlarmManager reminders for tasks with due dates
     */
    private void scheduleTaskReminders(JSONObject tasksData) {
        try {
            JSONArray tasks = tasksData.optJSONArray("tasks");
            if (tasks == null) return;

            AlarmManager alarmManager = (AlarmManager)
                getApplicationContext().getSystemService(Context.ALARM_SERVICE);

            if (alarmManager == null) return;

            // Get reminder preferences
            SharedPreferences prefs = getApplicationContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            int reminderMinutesBefore = prefs.getInt("reminderMinutes", 30); // Default 30 min

            for (int i = 0; i < tasks.length(); i++) {
                JSONObject task = tasks.getJSONObject(i);

                String taskId = task.optString("id");
                String title = task.optString("title", "Task");
                String dueDate = task.optString("dueDate");
                boolean isCompleted = task.optBoolean("completed", false);

                if (isCompleted || dueDate == null || dueDate.isEmpty()) {
                    continue; // Skip completed or no due date
                }

                // Parse due date and schedule reminder
                long dueTimeMs = parseDueDate(dueDate);
                if (dueTimeMs > 0) {
                    long reminderTimeMs = dueTimeMs - (reminderMinutesBefore * 60 * 1000L);

                    // Only schedule if reminder time is in the future
                    if (reminderTimeMs > System.currentTimeMillis()) {
                        scheduleReminder(alarmManager, taskId, title, reminderTimeMs);
                    }
                }
            }

            Log.d(TAG, "Task reminders scheduled");

        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule reminders: " + e.getMessage());
        }
    }

    /**
     * Schedule a single task reminder using AlarmManager
     */
    private void scheduleReminder(AlarmManager alarmManager, String taskId, String title, long triggerTimeMs) {
        Intent intent = new Intent(getApplicationContext(), TaskReminderReceiver.class);
        intent.setAction("TASK_REMINDER");
        intent.putExtra("taskId", taskId);
        intent.putExtra("title", title);

        // Use task ID hash as request code for uniqueness
        int requestCode = taskId.hashCode();

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            getApplicationContext(),
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Schedule exact alarm for precise timing
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12+ requires checking for exact alarm permission
            if (alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTimeMs,
                    pendingIntent
                );
            } else {
                // Fallback to inexact alarm
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTimeMs,
                    pendingIntent
                );
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            alarmManager.setExactAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerTimeMs,
                pendingIntent
            );
        } else {
            alarmManager.setExact(
                AlarmManager.RTC_WAKEUP,
                triggerTimeMs,
                pendingIntent
            );
        }

        Log.d(TAG, "Scheduled reminder for task: " + title + " at " + triggerTimeMs);
    }

    /**
     * Update the foreground service notification with task data
     */
    private void updateForegroundService(JSONObject tasksData) {
        try {
            int completedTasks = tasksData.optInt("completedCount", 0);
            int totalTasks = tasksData.optInt("totalCount", 0);
            int streak = tasksData.optInt("streak", 0);

            JSONObject nextTask = tasksData.optJSONObject("nextTask");
            String nextTaskTitle = "";
            String nextTaskTime = "";

            if (nextTask != null) {
                nextTaskTitle = nextTask.optString("title", "");
                nextTaskTime = nextTask.optString("dueTime", "");
            }

            // Send update to foreground service
            Intent serviceIntent = new Intent(getApplicationContext(), JournalMateService.class);
            serviceIntent.setAction("UPDATE_PROGRESS");
            serviceIntent.putExtra("completedTasks", completedTasks);
            serviceIntent.putExtra("totalTasks", totalTasks);
            serviceIntent.putExtra("streak", streak);
            serviceIntent.putExtra("nextTaskTitle", nextTaskTitle);
            serviceIntent.putExtra("nextTaskTime", nextTaskTime);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getApplicationContext().startForegroundService(serviceIntent);
            } else {
                getApplicationContext().startService(serviceIntent);
            }

        } catch (Exception e) {
            Log.e(TAG, "Failed to update foreground service: " + e.getMessage());
        }
    }

    /**
     * Parse ISO date string to milliseconds
     */
    private long parseDueDate(String dateStr) {
        try {
            // Simple ISO 8601 parsing
            // Format: 2024-01-15T10:30:00.000Z
            if (dateStr.contains("T")) {
                String[] parts = dateStr.split("T");
                String[] dateParts = parts[0].split("-");
                String timePart = parts[1].replace("Z", "").split("\\.")[0];
                String[] timeParts = timePart.split(":");

                Calendar cal = Calendar.getInstance();
                cal.set(Calendar.YEAR, Integer.parseInt(dateParts[0]));
                cal.set(Calendar.MONTH, Integer.parseInt(dateParts[1]) - 1);
                cal.set(Calendar.DAY_OF_MONTH, Integer.parseInt(dateParts[2]));
                cal.set(Calendar.HOUR_OF_DAY, Integer.parseInt(timeParts[0]));
                cal.set(Calendar.MINUTE, Integer.parseInt(timeParts[1]));
                cal.set(Calendar.SECOND, timeParts.length > 2 ? Integer.parseInt(timeParts[2]) : 0);
                cal.set(Calendar.MILLISECOND, 0);

                return cal.getTimeInMillis();
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to parse date: " + dateStr);
        }
        return 0;
    }

    /**
     * Refresh all home screen widgets with latest data
     * This triggers onUpdate() for all widget types, which will fetch fresh data from API
     */
    private void refreshAllWidgets() {
        try {
            Context context = getApplicationContext();
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);

            // Refresh all widget types
            refreshWidgetClass(context, appWidgetManager, JournalMateWidget2x2.class);
            refreshWidgetClass(context, appWidgetManager, JournalMateWidget4x1.class);
            refreshWidgetClass(context, appWidgetManager, JournalMateWidget4x2.class);

            Log.d(TAG, "All widgets refreshed from background sync");
        } catch (Exception e) {
            Log.e(TAG, "Failed to refresh widgets: " + e.getMessage());
        }
    }

    /**
     * Refresh a specific widget class by sending update broadcast
     */
    private void refreshWidgetClass(Context context, AppWidgetManager manager, Class<?> widgetClass) {
        ComponentName widget = new ComponentName(context, widgetClass);
        int[] ids = manager.getAppWidgetIds(widget);
        if (ids.length > 0) {
            Intent intent = new Intent(context, widgetClass);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
            context.sendBroadcast(intent);
            Log.d(TAG, "Refreshed " + ids.length + " widgets of type: " + widgetClass.getSimpleName());
        }
    }
}
