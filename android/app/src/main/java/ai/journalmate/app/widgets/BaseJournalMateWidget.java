package ai.journalmate.app.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.util.Log;
import android.os.Handler;
import android.os.Looper;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.json.JSONObject;

import ai.journalmate.app.MainActivity;
import ai.journalmate.app.R;

/**
 * Base class for all JournalMate widget providers.
 * Contains shared logic for data fetching, caching, and common UI updates.
 *
 * v4 - Progress Dashboard mirror: Tasks, Streak, Total, Rate, Notifications
 */
public abstract class BaseJournalMateWidget extends AppWidgetProvider {

    private static final String TAG = "JournalMateWidget";
    private static final String PREFS_NAME = "journalmate_widget";
    private static final String API_BASE_URL = "https://journalmate.ai";
    private static final ExecutorService executor = Executors.newSingleThreadExecutor();
    private static final Handler mainHandler = new Handler(Looper.getMainLooper());

    /**
     * Get the layout resource ID for this widget size.
     * Must be implemented by subclasses.
     */
    protected abstract int getLayoutId();

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    protected void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        Log.d(TAG, "Updating widget: " + appWidgetId + " with layout: " + getLayoutId());

        RemoteViews views = new RemoteViews(context.getPackageName(), getLayoutId());

        // Load cached data first for instant display
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        int tasksCompleted = prefs.getInt("tasksCompleted", 0);
        int tasksTotal = prefs.getInt("tasksTotal", 0);
        int streak = prefs.getInt("streak", 0);
        int totalCompleted = prefs.getInt("totalCompleted", 0);
        int completionRate = prefs.getInt("completionRate", 0);
        int unreadNotifications = prefs.getInt("unreadNotifications", 0);

        // Update views with cached data
        updateWidgetViews(context, views,
            tasksCompleted, tasksTotal,
            streak, totalCompleted,
            completionRate, unreadNotifications);

        // Set click listener to open app at Progress Dashboard
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        // Add extra to navigate to Progress Dashboard
        intent.putExtra("navigate_to", "progress");
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, appWidgetId, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);

        // Update widget with cached data immediately
        appWidgetManager.updateAppWidget(appWidgetId, views);

        // Fetch fresh data from server in background
        fetchWidgetData(context, appWidgetManager, appWidgetId);
    }

    protected void updateWidgetViews(Context context, RemoteViews views,
            int tasksCompleted, int tasksTotal,
            int streak, int totalCompleted,
            int completionRate, int unreadNotifications) {
        // Update 4 metrics in 2x2 grid matching Progress Dashboard
        // Row 1: Tasks (blue), Streak (green)
        // Row 2: Total (pink), Notifications (orange)
        views.setTextViewText(R.id.widget_tasks_count, tasksCompleted + "/" + tasksTotal);
        views.setTextViewText(R.id.widget_streak_count, String.valueOf(streak));
        views.setTextViewText(R.id.widget_total_count, String.valueOf(totalCompleted));
        views.setTextViewText(R.id.widget_notifications_count, String.valueOf(unreadNotifications));
    }

    protected void fetchWidgetData(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);

        // First try to get authToken for authentication
        String authToken = prefs.getString("journalmate_auth_token", null);

        // Also try to get userId as fallback
        String userId = prefs.getString("userId", null);
        if (userId == null) {
            // Try alternative storage location for userId
            SharedPreferences altPrefs = context.getSharedPreferences("journalmate_prefs", Context.MODE_PRIVATE);
            userId = altPrefs.getString("userId", null);
        }

        // Need at least authToken or userId to fetch data
        if (authToken == null && userId == null) {
            Log.d(TAG, "No auth credentials found, skipping data fetch");
            return;
        }

        final String finalAuthToken = authToken;
        final String finalUserId = userId;

        executor.execute(() -> {
            try {
                URL url = new URL(API_BASE_URL + "/api/tasks/widget");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");

                // Use authToken if available (preferred), otherwise use userId
                if (finalAuthToken != null) {
                    conn.setRequestProperty("Authorization", "Bearer " + finalAuthToken);
                    Log.d(TAG, "Using auth token for widget API");
                } else if (finalUserId != null) {
                    conn.setRequestProperty("X-User-ID", finalUserId);
                    Log.d(TAG, "Using user ID for widget API");
                }

                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);

                int responseCode = conn.getResponseCode();
                if (responseCode == 200) {
                    BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                    StringBuilder response = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        response.append(line);
                    }
                    reader.close();

                    JSONObject json = new JSONObject(response.toString());

                    // Parse API response - matches Progress Dashboard exactly
                    int tasksCompleted = json.optInt("tasksCompleted", 0);
                    int tasksTotal = json.optInt("tasksTotal", 0);
                    int streak = json.optInt("streak", 0);
                    int totalCompleted = json.optInt("totalCompleted", 0);
                    int completionRate = json.optInt("completionRate", 0);
                    int unreadNotifications = json.optInt("unreadNotifications", 0);

                    // Cache the data
                    SharedPreferences widgetPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                    widgetPrefs.edit()
                        .putInt("tasksCompleted", tasksCompleted)
                        .putInt("tasksTotal", tasksTotal)
                        .putInt("streak", streak)
                        .putInt("totalCompleted", totalCompleted)
                        .putInt("completionRate", completionRate)
                        .putInt("unreadNotifications", unreadNotifications)
                        .putLong("lastFetchTime", System.currentTimeMillis())
                        .apply();

                    // Update widget on main thread
                    mainHandler.post(() -> {
                        RemoteViews views = new RemoteViews(context.getPackageName(), getLayoutId());
                        updateWidgetViews(context, views,
                            tasksCompleted, tasksTotal,
                            streak, totalCompleted,
                            completionRate, unreadNotifications);

                        // Re-set click listener to open Progress Dashboard
                        Intent intent = new Intent(context, MainActivity.class);
                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        intent.putExtra("navigate_to", "progress");
                        PendingIntent pendingIntent = PendingIntent.getActivity(
                            context, appWidgetId, intent,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                        );
                        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);

                        appWidgetManager.updateAppWidget(appWidgetId, views);
                        Log.d(TAG, "Widget updated with fresh data: tasks=" + tasksCompleted + "/" + tasksTotal +
                              ", streak=" + streak + ", total=" + totalCompleted +
                              ", rate=" + completionRate + "%, notifications=" + unreadNotifications);
                    });
                } else {
                    Log.e(TAG, "API returned error: " + responseCode);
                }
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "Failed to fetch widget data: " + e.getMessage());
            }
        });
    }

    @Override
    public void onEnabled(Context context) {
        Log.d(TAG, "Widget enabled");
    }

    @Override
    public void onDisabled(Context context) {
        Log.d(TAG, "Widget disabled");
    }
}
