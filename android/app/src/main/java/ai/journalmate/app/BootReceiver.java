package ai.journalmate.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

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

            Log.d(TAG, "Device boot completed, checking background sync settings");

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
