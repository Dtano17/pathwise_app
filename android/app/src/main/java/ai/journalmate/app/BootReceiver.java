package ai.journalmate.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * BroadcastReceiver that runs after device boot
 *
 * Responsible for:
 * 1. Re-enabling background sync (WorkManager survives reboot, but let's be sure)
 * 2. Triggering an immediate sync to reschedule task reminders
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";
    private static final String PREFS_NAME = "journalmate_prefs";
    private static final String WORK_NAME = "task_sync_work";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action)) {

            Log.d(TAG, "Device boot completed, restoring scheduled notifications and sync settings");

            // Restore scheduled notifications first (most important for user experience)
            restoreScheduledNotifications(context);

            // Then re-enable background sync
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            boolean syncEnabled = prefs.getBoolean("backgroundSyncEnabled", false);

            if (syncEnabled) {
                int intervalMinutes = prefs.getInt("syncIntervalMinutes", 60);
                enableBackgroundSync(context, intervalMinutes);
                Log.d(TAG, "Background sync re-enabled after boot");
            }
        }
    }

    /**
     * Restore all scheduled notifications after device reboot
     * AlarmManager alarms are lost on reboot, so we need to reschedule from SharedPreferences
     */
    private void restoreScheduledNotifications(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences("scheduled_notifications", Context.MODE_PRIVATE);
            Map<String, ?> all = prefs.getAll();
            int restored = 0;
            int expired = 0;

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                Log.e(TAG, "AlarmManager not available");
                return;
            }

            for (Map.Entry<String, ?> entry : all.entrySet()) {
                try {
                    JSONObject json = new JSONObject((String) entry.getValue());
                    long triggerAt = json.getLong("triggerAt");

                    if (triggerAt > System.currentTimeMillis()) {
                        // Future notification - reschedule
                        int id = json.getInt("id");
                        String title = json.getString("title");
                        String body = json.getString("body");

                        Intent alarmIntent = new Intent(context, NotificationAlarmReceiver.class);
                        alarmIntent.setAction("SCHEDULED_NOTIFICATION");
                        alarmIntent.putExtra("id", id);
                        alarmIntent.putExtra("title", title);
                        alarmIntent.putExtra("body", body);

                        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                            context,
                            id,
                            alarmIntent,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                        );

                        // Schedule with appropriate method based on Android version
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                            if (alarmManager.canScheduleExactAlarms()) {
                                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
                            } else {
                                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
                            }
                        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
                        } else {
                            alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent);
                        }

                        restored++;
                    } else {
                        // Past due - remove from storage
                        prefs.edit().remove(entry.getKey()).apply();
                        expired++;
                    }
                } catch (JSONException e) {
                    Log.e(TAG, "Failed to parse scheduled notification: " + e.getMessage());
                    prefs.edit().remove(entry.getKey()).apply();
                }
            }

            Log.d(TAG, "Boot restoration complete: " + restored + " restored, " + expired + " expired");
        } catch (Exception e) {
            Log.e(TAG, "Failed to restore scheduled notifications: " + e.getMessage());
        }
    }

    /**
     * Re-enable background sync with WorkManager
     */
    private void enableBackgroundSync(Context context, int intervalMinutes) {
        try {
            Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

            PeriodicWorkRequest workRequest = new PeriodicWorkRequest.Builder(
                TaskSyncWorker.class,
                Math.max(15, intervalMinutes),
                TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .build();

            WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(
                    WORK_NAME,
                    ExistingPeriodicWorkPolicy.KEEP, // Keep existing if already scheduled
                    workRequest
                );

        } catch (Exception e) {
            Log.e(TAG, "Failed to enable background sync: " + e.getMessage());
        }
    }
}
