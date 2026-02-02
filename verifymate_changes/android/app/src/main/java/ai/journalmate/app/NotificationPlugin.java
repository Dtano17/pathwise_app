package ai.journalmate.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.JSObject;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Map;

@CapacitorPlugin(
    name = "NativeNotifications",
    permissions = {
        @Permission(
            strings = { "android.permission.POST_NOTIFICATIONS" },
            alias = "notifications"
        )
    }
)
public class NotificationPlugin extends Plugin {
    private static final String TAG = "NotificationPlugin";
    private static final String CHANNEL_ID = "journalmate_notifications";
    private static final String CHANNEL_NAME = "JournalMate Notifications";
    private static final String CHANNEL_DESC = "Notifications from JournalMate app";
    private static final String CHANNEL_ID_ALERTS = "journalmate_alerts";
    private static final String CHANNEL_NAME_ALERTS = "JournalMate Alerts";
    private static final String SCHEDULED_PREFS = "scheduled_notifications";

    @Override
    public void load() {
        super.load();
        createNotificationChannel();
        restoreScheduledNotifications();
    }

    /**
     * Restore scheduled notifications after app restart
     * This ensures alarms survive app force-close
     */
    private void restoreScheduledNotifications() {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(SCHEDULED_PREFS, Context.MODE_PRIVATE);
            Map<String, ?> all = prefs.getAll();
            int restored = 0;

            for (Map.Entry<String, ?> entry : all.entrySet()) {
                try {
                    JSONObject json = new JSONObject((String) entry.getValue());
                    long triggerAt = json.getLong("triggerAt");

                    if (triggerAt > System.currentTimeMillis()) {
                        // Future notification - reschedule
                        scheduleAlarm(
                            json.getInt("id"),
                            json.getString("title"),
                            json.getString("body"),
                            triggerAt
                        );
                        restored++;
                    } else {
                        // Past due - remove from storage
                        prefs.edit().remove(entry.getKey()).apply();
                    }
                } catch (JSONException e) {
                    Log.e(TAG, "Failed to parse scheduled notification: " + e.getMessage());
                    prefs.edit().remove(entry.getKey()).apply();
                }
            }

            if (restored > 0) {
                Log.d(TAG, "Restored " + restored + " scheduled notifications");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to restore scheduled notifications: " + e.getMessage());
        }
    }

    /**
     * Create notification channels (required for Android 8.0+)
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getContext().getSystemService(NotificationManager.class);
            if (notificationManager == null) {
                Log.e(TAG, "NotificationManager is null, cannot create channels");
                return;
            }

            // Default channel for general notifications
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription(CHANNEL_DESC);
            channel.enableVibration(true);
            channel.setShowBadge(true);
            notificationManager.createNotificationChannel(channel);
            Log.d(TAG, "Default notification channel created: " + CHANNEL_ID);

            // HIGH importance channel for alerts and test notifications
            NotificationChannel alertChannel = new NotificationChannel(
                CHANNEL_ID_ALERTS,
                CHANNEL_NAME_ALERTS,
                NotificationManager.IMPORTANCE_HIGH
            );
            alertChannel.setDescription("Important alerts and test notifications");
            alertChannel.enableVibration(true);
            alertChannel.setVibrationPattern(new long[]{0, 500, 200, 500});
            alertChannel.setShowBadge(true);
            alertChannel.enableLights(true);
            notificationManager.createNotificationChannel(alertChannel);
            Log.d(TAG, "Alert notification channel created: " + CHANNEL_ID_ALERTS);
        }
    }

    /**
     * Check if notification permission is granted
     */
    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject result = new JSObject();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Android 13+ requires POST_NOTIFICATIONS permission
            boolean granted = ContextCompat.checkSelfPermission(
                getContext(),
                "android.permission.POST_NOTIFICATIONS"
            ) == PackageManager.PERMISSION_GRANTED;
            result.put("granted", granted);
        } else {
            // Before Android 13, notifications are enabled by default
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(getContext());
            result.put("granted", notificationManager.areNotificationsEnabled());
        }

        result.put("platform", "android");
        call.resolve(result);
    }

    /**
     * Request notification permission (Android 13+)
     */
    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Android 13+ requires runtime permission
            if (ContextCompat.checkSelfPermission(
                    getContext(),
                    "android.permission.POST_NOTIFICATIONS"
                ) != PackageManager.PERMISSION_GRANTED) {

                // Request permission
                requestPermissionForAlias("notifications", call, "permissionCallback");
                return;
            }
        }

        // Permission already granted or not needed (pre-Android 13)
        JSObject result = new JSObject();
        result.put("granted", true);
        result.put("platform", "android");
        call.resolve(result);
    }

    /**
     * Callback after permission request
     */
    @PluginMethod
    public void permissionCallback(PluginCall call) {
        JSObject result = new JSObject();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            boolean granted = ContextCompat.checkSelfPermission(
                getContext(),
                "android.permission.POST_NOTIFICATIONS"
            ) == PackageManager.PERMISSION_GRANTED;
            result.put("granted", granted);
        } else {
            result.put("granted", true);
        }

        result.put("platform", "android");
        call.resolve(result);
    }

    /**
     * Show a local notification immediately
     * Uses HIGH importance alerts channel for visibility
     */
    @PluginMethod
    public void show(PluginCall call) {
        String title = call.getString("title", "JournalMate");
        String body = call.getString("body", "");
        Integer id = call.getInt("id", (int) System.currentTimeMillis());

        Log.d(TAG, "=== show() called ===");
        Log.d(TAG, "Title: " + title);
        Log.d(TAG, "Body: " + body);
        Log.d(TAG, "ID: " + id);

        try {
            // Create intent to open app when notification is tapped
            Intent intent = new Intent(getContext(), MainActivity.class);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                getContext(),
                id,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            // Build the notification using ALERTS channel for high visibility
            NotificationCompat.Builder builder = new NotificationCompat.Builder(getContext(), CHANNEL_ID_ALERTS)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setAutoCancel(true)
                .setVibrate(new long[]{0, 500, 200, 500})
                .setContentIntent(pendingIntent);

            // Show the notification
            NotificationManagerCompat notificationManager = NotificationManagerCompat.from(getContext());

            // Check permission before showing (Android 13+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(
                        getContext(),
                        "android.permission.POST_NOTIFICATIONS"
                    ) != PackageManager.PERMISSION_GRANTED) {
                    Log.w(TAG, "Notification permission not granted");
                    JSObject result = new JSObject();
                    result.put("success", false);
                    result.put("error", "Permission not granted. Please enable notifications in app settings.");
                    call.resolve(result);
                    return;
                }
            }

            notificationManager.notify(id, builder.build());
            Log.d(TAG, "=== Notification shown successfully with ID: " + id + " ===");

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("id", id);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to show notification: " + e.getMessage());
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
    public void cancel(PluginCall call) {
        Integer id = call.getInt("id");

        if (id == null) {
            call.reject("Notification ID is required");
            return;
        }

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(getContext());
        notificationManager.cancel(id);

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    /**
     * Cancel all notifications
     */
    @PluginMethod
    public void cancelAll(PluginCall call) {
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(getContext());
        notificationManager.cancelAll();

        // Also clear all scheduled notifications
        SharedPreferences prefs = getContext().getSharedPreferences(SCHEDULED_PREFS, Context.MODE_PRIVATE);
        prefs.edit().clear().apply();

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }

    /**
     * Schedule a notification for a future time
     * Uses AlarmManager for reliable delivery even when app is killed
     */
    @PluginMethod
    public void schedule(PluginCall call) {
        String title = call.getString("title", "JournalMate");
        String body = call.getString("body", "");
        Integer id = call.getInt("id", (int) System.currentTimeMillis());
        Long triggerAt = call.getLong("triggerAt");

        if (triggerAt == null) {
            call.reject("triggerAt is required (milliseconds since epoch)");
            return;
        }

        // Validate trigger time is in the future
        if (triggerAt <= System.currentTimeMillis()) {
            // If time is in the past, show immediately instead
            Log.w(TAG, "Scheduled time is in the past, showing immediately");
            call.getData().put("id", id);
            show(call);
            return;
        }

        Log.d(TAG, "Scheduling notification for " + triggerAt + ": " + title);

        try {
            // Schedule the alarm
            scheduleAlarm(id, title, body, triggerAt);

            // Store for restoration after app restart
            saveScheduledNotification(id, title, body, triggerAt);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("id", id);
            result.put("scheduledAt", triggerAt);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule notification: " + e.getMessage());
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    /**
     * Get all pending scheduled notifications
     */
    @PluginMethod
    public void getPending(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences(SCHEDULED_PREFS, Context.MODE_PRIVATE);
            Map<String, ?> all = prefs.getAll();

            JSObject result = new JSObject();
            JSObject notifications = new JSObject();

            for (Map.Entry<String, ?> entry : all.entrySet()) {
                try {
                    JSONObject json = new JSONObject((String) entry.getValue());
                    long triggerAt = json.getLong("triggerAt");

                    // Only include future notifications
                    if (triggerAt > System.currentTimeMillis()) {
                        JSObject notif = new JSObject();
                        notif.put("id", json.getInt("id"));
                        notif.put("title", json.getString("title"));
                        notif.put("body", json.getString("body"));
                        notif.put("triggerAt", triggerAt);
                        notifications.put(entry.getKey(), notif);
                    }
                } catch (JSONException e) {
                    Log.e(TAG, "Failed to parse notification: " + e.getMessage());
                }
            }

            result.put("notifications", notifications);
            result.put("count", notifications.length());
            call.resolve(result);

        } catch (Exception e) {
            call.reject("Failed to get pending notifications: " + e.getMessage());
        }
    }

    /**
     * Schedule an alarm using AlarmManager
     */
    private void scheduleAlarm(int id, String title, String body, long triggerAt) {
        Intent intent = new Intent(getContext(), NotificationAlarmReceiver.class);
        intent.setAction("SCHEDULED_NOTIFICATION");
        intent.putExtra("id", id);
        intent.putExtra("title", title);
        intent.putExtra("body", body);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            getContext(),
            id,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        AlarmManager alarmManager = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);

        if (alarmManager == null) {
            Log.e(TAG, "AlarmManager not available");
            return;
        }

        // Use exact alarms when possible for precise timing
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Android 12+ - check if we can schedule exact alarms
            if (alarmManager.canScheduleExactAlarms()) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
                Log.d(TAG, "Scheduled exact alarm for ID " + id);
            } else {
                // Fall back to inexact alarm
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
                Log.d(TAG, "Scheduled inexact alarm for ID " + id + " (exact alarms not permitted)");
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // Android 6.0+ - use setExactAndAllowWhileIdle for Doze mode
            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
            Log.d(TAG, "Scheduled exact alarm for ID " + id);
        } else {
            // Older Android - use setExact
            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
            Log.d(TAG, "Scheduled alarm for ID " + id);
        }
    }

    /**
     * Save scheduled notification to SharedPreferences for restoration
     */
    private void saveScheduledNotification(int id, String title, String body, long triggerAt) {
        try {
            JSONObject json = new JSONObject();
            json.put("id", id);
            json.put("title", title);
            json.put("body", body);
            json.put("triggerAt", triggerAt);

            SharedPreferences prefs = getContext().getSharedPreferences(SCHEDULED_PREFS, Context.MODE_PRIVATE);
            prefs.edit().putString(String.valueOf(id), json.toString()).apply();

            Log.d(TAG, "Saved scheduled notification: " + id);
        } catch (JSONException e) {
            Log.e(TAG, "Failed to save scheduled notification: " + e.getMessage());
        }
    }

    /**
     * Remove a scheduled notification from storage
     * Called when notification is shown or cancelled
     */
    public static void removeScheduledNotification(Context context, int id) {
        SharedPreferences prefs = context.getSharedPreferences(SCHEDULED_PREFS, Context.MODE_PRIVATE);
        prefs.edit().remove(String.valueOf(id)).apply();
        Log.d(TAG, "Removed scheduled notification: " + id);
    }
}
