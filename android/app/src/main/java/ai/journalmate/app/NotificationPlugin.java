package ai.journalmate.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
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

    @Override
    public void load() {
        super.load();
        createNotificationChannel();
    }

    /**
     * Create the notification channel (required for Android 8.0+)
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription(CHANNEL_DESC);
            channel.enableVibration(true);
            channel.setShowBadge(true);

            NotificationManager notificationManager = getContext().getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
                Log.d(TAG, "Notification channel created");
            }
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
     * Show a local notification
     */
    @PluginMethod
    public void show(PluginCall call) {
        String title = call.getString("title", "JournalMate");
        String body = call.getString("body", "");
        Integer id = call.getInt("id", (int) System.currentTimeMillis());

        Log.d(TAG, "Showing notification: " + title + " - " + body);

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

            // Build the notification
            NotificationCompat.Builder builder = new NotificationCompat.Builder(getContext(), CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification) // Use notification icon
                .setContentTitle(title)
                .setContentText(body)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true)
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
                    result.put("error", "Permission not granted");
                    call.resolve(result);
                    return;
                }
            }

            notificationManager.notify(id, builder.build());
            Log.d(TAG, "Notification shown successfully with ID: " + id);

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

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
}
