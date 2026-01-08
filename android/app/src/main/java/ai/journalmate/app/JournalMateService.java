package ai.journalmate.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * Foreground Service for JournalMate
 *
 * Shows a persistent notification at the top of the notification shade
 * displaying today's task progress and providing quick actions.
 *
 * This service runs in the foreground, meaning it won't be killed by Android
 * and keeps the app "running at the top".
 */
public class JournalMateService extends Service {
    private static final String TAG = "JournalMateService";
    private static final String CHANNEL_ID = "journalmate_foreground";
    private static final String CHANNEL_NAME = "JournalMate Active";
    private static final int NOTIFICATION_ID = 1001;

    // Current state - can be updated from JavaScript bridge
    private int completedTasks = 0;
    private int totalTasks = 0;
    private int currentStreak = 0;
    private String nextTaskTitle = "";
    private String nextTaskTime = "";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "JournalMateService created");
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "JournalMateService started");

        if (intent != null) {
            String action = intent.getAction();

            if ("UPDATE_PROGRESS".equals(action)) {
                // Update from JavaScript bridge
                completedTasks = intent.getIntExtra("completedTasks", completedTasks);
                totalTasks = intent.getIntExtra("totalTasks", totalTasks);
                currentStreak = intent.getIntExtra("streak", currentStreak);
                nextTaskTitle = intent.getStringExtra("nextTaskTitle");
                nextTaskTime = intent.getStringExtra("nextTaskTime");

                if (nextTaskTitle == null) nextTaskTitle = "";
                if (nextTaskTime == null) nextTaskTime = "";

                updateNotification();
                return START_STICKY;
            } else if ("STOP_SERVICE".equals(action)) {
                stopForeground(true);
                stopSelf();
                return START_NOT_STICKY;
            }
        }

        // Start as foreground service with notification
        startForeground(NOTIFICATION_ID, buildNotification());

        return START_STICKY; // Restart if killed
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null; // Not a bound service
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "JournalMateService destroyed");
    }

    /**
     * Create the notification channel (required for Android 8.0+)
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW // Low = no sound, but visible
            );
            channel.setDescription("Shows your daily progress and upcoming tasks");
            channel.setShowBadge(false);
            channel.setSound(null, null); // Silent

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    /**
     * Build the foreground notification
     */
    private Notification buildNotification() {
        // Intent to open app when notification is tapped
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent openPendingIntent = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Action: Add Task
        Intent addTaskIntent = new Intent(this, MainActivity.class);
        addTaskIntent.setAction("ADD_TASK");
        addTaskIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent addTaskPendingIntent = PendingIntent.getActivity(
            this, 1, addTaskIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Action: View Today
        Intent viewTodayIntent = new Intent(this, MainActivity.class);
        viewTodayIntent.setAction("VIEW_TODAY");
        viewTodayIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent viewTodayPendingIntent = PendingIntent.getActivity(
            this, 2, viewTodayIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Build content text
        String contentText;
        if (totalTasks > 0) {
            int percentage = (int) ((completedTasks * 100.0) / totalTasks);
            contentText = String.format("%d/%d tasks done (%d%%)", completedTasks, totalTasks, percentage);
            if (currentStreak > 0) {
                contentText += String.format(" • %d day streak 🔥", currentStreak);
            }
        } else {
            contentText = "No tasks for today. Tap to add one!";
        }

        // Build expanded content
        String bigText = contentText;
        if (!nextTaskTitle.isEmpty()) {
            bigText += "\n\n📋 Next: " + nextTaskTitle;
            if (!nextTaskTime.isEmpty()) {
                bigText += " at " + nextTaskTime;
            }
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("JournalMate")
            .setContentText(contentText)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(bigText))
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true) // Can't be dismissed
            .setShowWhen(false) // Don't show timestamp
            .setContentIntent(openPendingIntent)
            .addAction(R.drawable.ic_notification, "Add Task", addTaskPendingIntent)
            .addAction(R.drawable.ic_notification, "Today", viewTodayPendingIntent);

        // Progress bar if tasks exist
        if (totalTasks > 0) {
            builder.setProgress(totalTasks, completedTasks, false);
        }

        return builder.build();
    }

    /**
     * Update the notification with new data
     */
    private void updateNotification() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, buildNotification());
        }
    }
}
