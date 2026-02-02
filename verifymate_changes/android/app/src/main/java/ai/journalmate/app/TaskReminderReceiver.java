package ai.journalmate.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import android.graphics.Color;
import androidx.core.app.NotificationCompat;

/**
 * BroadcastReceiver for task reminder alarms
 *
 * Triggered by AlarmManager when a task reminder is due.
 * Shows a high-priority notification with sound and vibration.
 */
public class TaskReminderReceiver extends BroadcastReceiver {
    private static final String TAG = "TaskReminderReceiver";
    private static final String CHANNEL_ID = "journalmate_reminders";
    private static final String CHANNEL_NAME = "Task Reminders";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "Task reminder received");

        String action = intent.getAction();
        if (!"TASK_REMINDER".equals(action)) {
            return;
        }

        String taskId = intent.getStringExtra("taskId");
        String title = intent.getStringExtra("title");

        if (title == null || title.isEmpty()) {
            title = "Task Due";
        }

        // Create notification channel
        createNotificationChannel(context);

        // Show the reminder notification
        showReminderNotification(context, taskId, title);
    }

    /**
     * Create high-priority notification channel for reminders
     */
    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH // High = sound + heads-up
            );
            channel.setDescription("Reminders for upcoming tasks");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500});
            channel.setShowBadge(true);

            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    /**
     * Show the task reminder notification
     */
    private void showReminderNotification(Context context, String taskId, String title) {
        // Intent to open app and view the task
        Intent openIntent = new Intent(context, MainActivity.class);
        openIntent.setAction("VIEW_TASK");
        openIntent.putExtra("taskId", taskId);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent openPendingIntent = PendingIntent.getActivity(
            context,
            taskId != null ? taskId.hashCode() : 0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Action: Mark as Done
        Intent doneIntent = new Intent(context, TaskActionReceiver.class);
        doneIntent.setAction("MARK_DONE");
        doneIntent.putExtra("taskId", taskId);

        PendingIntent donePendingIntent = PendingIntent.getBroadcast(
            context,
            (taskId != null ? taskId.hashCode() : 0) + 1000,
            doneIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Action: Snooze (15 min)
        Intent snoozeIntent = new Intent(context, TaskActionReceiver.class);
        snoozeIntent.setAction("SNOOZE");
        snoozeIntent.putExtra("taskId", taskId);
        snoozeIntent.putExtra("title", title);
        snoozeIntent.putExtra("snoozeMinutes", 15);

        PendingIntent snoozePendingIntent = PendingIntent.getBroadcast(
            context,
            (taskId != null ? taskId.hashCode() : 0) + 2000,
            snoozeIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Default notification sound
        Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        // Purple accent color matching widget design (#8b5cf6)
        int accentColor = Color.parseColor("#8b5cf6");

        // Build notification with dark theme styling
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("⏰ Task Reminder")
            .setContentText(title)
            .setStyle(new NotificationCompat.BigTextStyle()
                .bigText(title + "\n\nYour task is due soon!"))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setSound(soundUri)
            .setVibrate(new long[]{0, 500, 200, 500})
            .setContentIntent(openPendingIntent)
            .setColor(accentColor)
            .setColorized(true)
            .addAction(R.drawable.ic_notification, "✓ Done", donePendingIntent)
            .addAction(R.drawable.ic_notification, "⏰ Snooze 15m", snoozePendingIntent);

        // Show notification
        NotificationManager manager = (NotificationManager)
            context.getSystemService(Context.NOTIFICATION_SERVICE);

        if (manager != null) {
            int notificationId = taskId != null ? taskId.hashCode() : (int) System.currentTimeMillis();
            manager.notify(notificationId, builder.build());
            Log.d(TAG, "Reminder notification shown for: " + title);
        }
    }
}
