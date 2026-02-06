package ai.journalmate.app;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;
import android.widget.Toast;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * BroadcastReceiver for handling notification actions
 *
 * Handles:
 * - MARK_DONE: Mark a task as completed
 * - SNOOZE: Reschedule reminder for later
 */
public class TaskActionReceiver extends BroadcastReceiver {
    private static final String TAG = "TaskActionReceiver";
    private static final String PREFS_NAME = "journalmate_prefs";
    private static final String BASE_URL = "https://journalmate.ai";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        String taskId = intent.getStringExtra("taskId");

        Log.d(TAG, "Action received: " + action + " for task: " + taskId);

        if (action == null || taskId == null) {
            return;
        }

        // Dismiss the notification
        NotificationManager notificationManager = (NotificationManager)
            context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.cancel(taskId.hashCode());
        }

        switch (action) {
            case "MARK_DONE":
                markTaskAsDone(context, taskId);
                break;

            case "SNOOZE":
                String title = intent.getStringExtra("title");
                int snoozeMinutes = intent.getIntExtra("snoozeMinutes", 15);
                snoozeReminder(context, taskId, title, snoozeMinutes);
                break;
        }
    }

    /**
     * Mark task as completed via API
     */
    private void markTaskAsDone(Context context, String taskId) {
        executor.execute(() -> {
            try {
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                String authToken = prefs.getString("authToken", null);

                if (authToken == null) {
                    showToast(context, "Please open app to complete task");
                    return;
                }

                URL url = new URL(BASE_URL + "/api/tasks/" + taskId + "/complete");
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setRequestProperty("Authorization", "Bearer " + authToken);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setDoOutput(true);

                // Send empty body
                OutputStream os = connection.getOutputStream();
                os.write("{}".getBytes());
                os.flush();
                os.close();

                int responseCode = connection.getResponseCode();
                connection.disconnect();

                if (responseCode == 200 || responseCode == 201) {
                    showToast(context, "✓ Task completed!");
                    Log.d(TAG, "Task marked as done: " + taskId);
                } else {
                    showToast(context, "Failed to complete task");
                    Log.w(TAG, "API returned: " + responseCode);
                }

            } catch (Exception e) {
                Log.e(TAG, "Failed to mark task done: " + e.getMessage());
                showToast(context, "Network error. Open app to complete.");
            }
        });
    }

    /**
     * Snooze reminder - reschedule for later
     */
    private void snoozeReminder(Context context, String taskId, String title, int snoozeMinutes) {
        AlarmManager alarmManager = (AlarmManager)
            context.getSystemService(Context.ALARM_SERVICE);

        if (alarmManager == null) {
            showToast(context, "Failed to snooze");
            return;
        }

        // Calculate new trigger time
        long triggerTimeMs = System.currentTimeMillis() + (snoozeMinutes * 60 * 1000L);

        // Create reminder intent
        Intent reminderIntent = new Intent(context, TaskReminderReceiver.class);
        reminderIntent.setAction("TASK_REMINDER");
        reminderIntent.putExtra("taskId", taskId);
        reminderIntent.putExtra("title", title);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            taskId.hashCode() + 5000, // Different request code for snooze
            reminderIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Schedule the snoozed reminder
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerTimeMs,
                    pendingIntent
                );
            } else {
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

        showToast(context, "⏰ Snoozed for " + snoozeMinutes + " minutes");
        Log.d(TAG, "Reminder snoozed for " + snoozeMinutes + " minutes");
    }

    /**
     * Show toast on UI thread
     */
    private void showToast(Context context, String message) {
        android.os.Handler mainHandler = new android.os.Handler(context.getMainLooper());
        mainHandler.post(() -> Toast.makeText(context, message, Toast.LENGTH_SHORT).show());
    }
}
