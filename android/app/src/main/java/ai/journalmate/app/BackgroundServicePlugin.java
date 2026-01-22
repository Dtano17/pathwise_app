package ai.journalmate.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import ai.journalmate.app.widgets.JournalMateWidget2x2;
import ai.journalmate.app.widgets.JournalMateWidget4x1;
import ai.journalmate.app.widgets.JournalMateWidget4x2;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

import java.util.concurrent.TimeUnit;

/**
 * Capacitor Plugin for controlling Android background services
 *
 * Provides JavaScript API to:
 * - Start/stop foreground service (persistent notification)
 * - Enable/disable background sync
 * - Update task progress in notification
 * - Store auth credentials for background workers
 */
@CapacitorPlugin(name = "BackgroundService")
public class BackgroundServicePlugin extends Plugin {
    private static final String TAG = "BackgroundServicePlugin";
    private static final String PREFS_NAME = "journalmate_prefs";
    private static final String WORK_NAME = "task_sync_work";
    private static final String ALERT_CHANNEL_ID = "journalmate_alerts";
    private static final String ALERT_CHANNEL_NAME = "JournalMate Alerts";

    @Override
    public void load() {
        super.load();
        createAlertNotificationChannel();
    }

    /**
     * Create the alert notification channel for one-time notifications
     */
    private void createAlertNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                ALERT_CHANNEL_ID,
                ALERT_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Important alerts and reminders from JournalMate");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 400, 200, 400});
            channel.setShowBadge(true);
            channel.enableLights(true);

            NotificationManager manager = getContext().getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
                Log.d(TAG, "Alert notification channel created: " + ALERT_CHANNEL_ID);
            }
        }
    }

    /**
     * Start the foreground service (persistent notification at top)
     */
    @PluginMethod
    public void startForegroundService(PluginCall call) {
        Log.d(TAG, "Starting foreground service");

        try {
            Context context = getContext();
            Intent serviceIntent = new Intent(context, JournalMateService.class);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to start foreground service: " + e.getMessage());
            call.reject("Failed to start service: " + e.getMessage());
        }
    }

    /**
     * Stop the foreground service
     */
    @PluginMethod
    public void stopForegroundService(PluginCall call) {
        Log.d(TAG, "Stopping foreground service");

        try {
            Context context = getContext();
            Intent serviceIntent = new Intent(context, JournalMateService.class);
            serviceIntent.setAction("STOP_SERVICE");
            context.startService(serviceIntent);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to stop foreground service: " + e.getMessage());
            call.reject("Failed to stop service: " + e.getMessage());
        }
    }

    /**
     * Update the foreground notification with current progress
     */
    @PluginMethod
    public void updateProgress(PluginCall call) {
        int completedTasks = call.getInt("completedTasks", 0);
        int totalTasks = call.getInt("totalTasks", 0);
        int streak = call.getInt("streak", 0);
        String nextTaskTitle = call.getString("nextTaskTitle", "");
        String nextTaskTime = call.getString("nextTaskTime", "");

        Log.d(TAG, "Updating progress: " + completedTasks + "/" + totalTasks);

        try {
            Context context = getContext();
            Intent serviceIntent = new Intent(context, JournalMateService.class);
            serviceIntent.setAction("UPDATE_PROGRESS");
            serviceIntent.putExtra("completedTasks", completedTasks);
            serviceIntent.putExtra("totalTasks", totalTasks);
            serviceIntent.putExtra("streak", streak);
            serviceIntent.putExtra("nextTaskTitle", nextTaskTitle);
            serviceIntent.putExtra("nextTaskTime", nextTaskTime);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to update progress: " + e.getMessage());
            call.reject("Failed to update progress: " + e.getMessage());
        }
    }

    /**
     * Enable background sync (WorkManager)
     * Syncs tasks periodically even when app is closed
     */
    @PluginMethod
    public void enableBackgroundSync(PluginCall call) {
        int intervalMinutes = call.getInt("intervalMinutes", 60);

        Log.d(TAG, "Enabling background sync with interval: " + intervalMinutes + " min");

        try {
            // Constraints: requires network
            Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

            // Periodic work request (minimum 15 minutes)
            int actualInterval = Math.max(15, intervalMinutes);
            PeriodicWorkRequest workRequest = new PeriodicWorkRequest.Builder(
                TaskSyncWorker.class,
                actualInterval,
                TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .build();

            // Enqueue with unique name (replaces existing)
            WorkManager.getInstance(getContext())
                .enqueueUniquePeriodicWork(
                    WORK_NAME,
                    ExistingPeriodicWorkPolicy.UPDATE,
                    workRequest
                );

            // Save preference
            SharedPreferences prefs = getContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                .putBoolean("backgroundSyncEnabled", true)
                .putInt("syncIntervalMinutes", actualInterval)
                .apply();

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("intervalMinutes", actualInterval);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to enable background sync: " + e.getMessage());
            call.reject("Failed to enable sync: " + e.getMessage());
        }
    }

    /**
     * Disable background sync
     */
    @PluginMethod
    public void disableBackgroundSync(PluginCall call) {
        Log.d(TAG, "Disabling background sync");

        try {
            WorkManager.getInstance(getContext()).cancelUniqueWork(WORK_NAME);

            // Save preference
            SharedPreferences prefs = getContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                .putBoolean("backgroundSyncEnabled", false)
                .apply();

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to disable background sync: " + e.getMessage());
            call.reject("Failed to disable sync: " + e.getMessage());
        }
    }

    /**
     * Store user credentials for background workers
     * Background workers need these to authenticate with API
     */
    @PluginMethod
    public void setUserCredentials(PluginCall call) {
        String userId = call.getString("userId");
        String authToken = call.getString("authToken");

        Log.d(TAG, "Storing user credentials for background sync");

        try {
            SharedPreferences prefs = getContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                .putString("userId", userId)
                .putString("authToken", authToken)
                .apply();

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to store credentials: " + e.getMessage());
            call.reject("Failed to store credentials: " + e.getMessage());
        }
    }

    /**
     * Clear stored credentials (logout)
     */
    @PluginMethod
    public void clearUserCredentials(PluginCall call) {
        Log.d(TAG, "Clearing user credentials");

        try {
            SharedPreferences prefs = getContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                .remove("userId")
                .remove("authToken")
                .apply();

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to clear credentials: " + e.getMessage());
            call.reject("Failed to clear credentials: " + e.getMessage());
        }
    }

    /**
     * Set reminder preferences
     */
    @PluginMethod
    public void setReminderPreferences(PluginCall call) {
        int minutesBefore = call.getInt("minutesBefore", 30);

        Log.d(TAG, "Setting reminder preference: " + minutesBefore + " minutes before");

        try {
            SharedPreferences prefs = getContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit()
                .putInt("reminderMinutes", minutesBefore)
                .apply();

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to set reminder preferences: " + e.getMessage());
            call.reject("Failed to set preferences: " + e.getMessage());
        }
    }

    /**
     * Update widget data cache directly from app
     * This allows instant widget updates without API calls
     * Call this when task/goal progress changes, then call refreshWidgets()
     */
    @PluginMethod
    public void updateWidgetData(PluginCall call) {
        int tasksCompleted = call.getInt("tasksCompleted", 0);
        int tasksTotal = call.getInt("tasksTotal", 0);
        int streak = call.getInt("streak", 0);
        int totalCompleted = call.getInt("totalCompleted", 0);
        int completionRate = call.getInt("completionRate", 0);
        int unreadNotifications = call.getInt("unreadNotifications", 0);

        Log.d(TAG, "Updating widget data cache: tasks=" + tasksCompleted + "/" + tasksTotal +
              ", streak=" + streak + ", total=" + totalCompleted + ", notifications=" + unreadNotifications);

        try {
            // Write directly to widget cache (same prefs the widget reads from)
            SharedPreferences widgetPrefs = getContext()
                .getSharedPreferences("journalmate_widget", Context.MODE_PRIVATE);
            widgetPrefs.edit()
                .putInt("tasksCompleted", tasksCompleted)
                .putInt("tasksTotal", tasksTotal)
                .putInt("streak", streak)
                .putInt("totalCompleted", totalCompleted)
                .putInt("completionRate", completionRate)
                .putInt("unreadNotifications", unreadNotifications)
                .putLong("lastFetchTime", System.currentTimeMillis())
                .apply();

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to update widget data: " + e.getMessage());
            call.reject("Failed to update widget data: " + e.getMessage());
        }
    }

    /**
     * Refresh all home screen widgets
     * Call this when task/goal progress changes
     */
    @PluginMethod
    public void refreshWidgets(PluginCall call) {
        Log.d(TAG, "Refreshing all widgets");

        try {
            Context context = getContext();
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);

            // Refresh all widget types
            refreshWidgetClass(context, appWidgetManager, JournalMateWidget2x2.class);
            refreshWidgetClass(context, appWidgetManager, JournalMateWidget4x1.class);
            refreshWidgetClass(context, appWidgetManager, JournalMateWidget4x2.class);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to refresh widgets: " + e.getMessage());
            call.reject("Failed to refresh widgets: " + e.getMessage());
        }
    }

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

    /**
     * Get current background service status
     */
    @PluginMethod
    public void getStatus(PluginCall call) {
        try {
            SharedPreferences prefs = getContext()
                .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

            boolean backgroundSyncEnabled = prefs.getBoolean("backgroundSyncEnabled", false);
            int syncInterval = prefs.getInt("syncIntervalMinutes", 60);
            int reminderMinutes = prefs.getInt("reminderMinutes", 30);
            boolean hasCredentials = prefs.getString("authToken", null) != null;

            JSObject result = new JSObject();
            result.put("backgroundSyncEnabled", backgroundSyncEnabled);
            result.put("syncIntervalMinutes", syncInterval);
            result.put("reminderMinutesBefore", reminderMinutes);
            result.put("hasCredentials", hasCredentials);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to get status: " + e.getMessage());
            call.reject("Failed to get status: " + e.getMessage());
        }
    }

    /**
     * Show a one-time notification (for test notifications, reminders, alerts)
     * Uses the same reliable method as the foreground service notification
     */
    @PluginMethod
    public void showNotification(PluginCall call) {
        String title = call.getString("title", "JournalMate");
        String body = call.getString("body", "");
        Integer id = call.getInt("id", (int) System.currentTimeMillis());

        Log.d(TAG, "=== showNotification called ===");
        Log.d(TAG, "Title: " + title);
        Log.d(TAG, "Body: " + body);
        Log.d(TAG, "ID: " + id);

        try {
            Context context = getContext();

            // Check permission on Android 13+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(context, "android.permission.POST_NOTIFICATIONS")
                        != PackageManager.PERMISSION_GRANTED) {
                    Log.w(TAG, "Notification permission not granted");
                    JSObject result = new JSObject();
                    result.put("success", false);
                    result.put("error", "Notification permission not granted. Please enable in Settings.");
                    call.resolve(result);
                    return;
                }
            }

            // Create intent to open app when notification is tapped
            Intent intent = new Intent(context, MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                context, id, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Build notification with HIGH priority for visibility
            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, ALERT_CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setAutoCancel(true)
                .setVibrate(new long[]{0, 400, 200, 400})
                .setContentIntent(pendingIntent);

            // Show the notification
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);
            notificationManager.notify(id, builder.build());

            Log.d(TAG, "=== Notification shown successfully with ID: " + id + " ===");

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("id", id);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to show notification: " + e.getMessage(), e);
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    /**
     * Cancel a notification by ID
     */
    @PluginMethod
    public void cancelNotification(PluginCall call) {
        Integer id = call.getInt("id");
        if (id == null) {
            call.reject("Notification ID is required");
            return;
        }

        Log.d(TAG, "Cancelling notification with ID: " + id);

        try {
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(getContext());
            notificationManager.cancel(id);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to cancel notification: " + e.getMessage());
            call.reject("Failed to cancel notification: " + e.getMessage());
        }
    }
}
