package ai.journalmate.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

/**
 * BroadcastReceiver for scheduled notification alarms
 *
 * Triggered by AlarmManager when a scheduled notification is due.
 * Shows the notification and removes it from the scheduled list.
 *
 * This receiver works even when the app is killed because:
 * 1. AlarmManager schedules are persistent (survive app kill)
 * 2. Scheduled notifications are stored in SharedPreferences
 * 3. NotificationPlugin restores schedules on app restart
 */
public class NotificationAlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "NotificationAlarmReceiver";
    private static final String CHANNEL_ID = "journalmate_scheduled";
    private static final String CHANNEL_NAME = "Scheduled Notifications";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();

        if (!"SCHEDULED_NOTIFICATION".equals(action)) {
            Log.w(TAG, "Received unknown action: " + action);
            return;
        }

        int id = intent.getIntExtra("id", 0);
        String title = intent.getStringExtra("title");
        String body = intent.getStringExtra("body");

        Log.d(TAG, "Scheduled notification triggered - ID: " + id + ", Title: " + title);

        // Show the notification
        showNotification(context, id, title, body);

        // Remove from scheduled storage
        NotificationPlugin.removeScheduledNotification(context, id);
    }

    /**
     * Create notification channel for scheduled notifications
     */
    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH // High priority for scheduled reminders
            );
            channel.setDescription("Scheduled reminders and notifications");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500});
            channel.setShowBadge(true);
            channel.enableLights(true);
            channel.setLightColor(Color.parseColor("#8b5cf6")); // Purple accent

            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    /**
     * Show the notification
     */
    private void showNotification(Context context, int id, String title, String body) {
        // Ensure channel exists
        createNotificationChannel(context);

        // Check permission on Android 13+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(context, "android.permission.POST_NOTIFICATIONS")
                    != PackageManager.PERMISSION_GRANTED) {
                Log.w(TAG, "Notification permission not granted, cannot show notification");
                return;
            }
        }

        // Intent to open app when notification is tapped
        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            id,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Purple accent color matching app theme (#8b5cf6)
        int accentColor = Color.parseColor("#8b5cf6");

        // Build the notification
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title != null ? title : "JournalMate")
            .setContentText(body != null ? body : "")
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setColor(accentColor)
            .setVibrate(new long[]{0, 500, 200, 500});

        // Show the notification
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(context);

        try {
            notificationManager.notify(id, builder.build());
            Log.d(TAG, "Scheduled notification shown with ID: " + id);
        } catch (SecurityException e) {
            Log.e(TAG, "Security exception showing notification: " + e.getMessage());
        }
    }
}
