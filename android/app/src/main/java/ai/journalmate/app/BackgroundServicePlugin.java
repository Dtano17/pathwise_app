package ai.journalmate.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import ai.journalmate.app.widgets.JournalMateWidget2x2;
import ai.journalmate.app.widgets.JournalMateWidget4x1;
import ai.journalmate.app.widgets.JournalMateWidget4x2;

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
}
