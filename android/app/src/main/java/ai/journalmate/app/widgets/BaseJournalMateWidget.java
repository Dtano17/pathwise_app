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
 * v3 - Mini dashboard showing completed/total for each metric
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
        int goalsCompleted = prefs.getInt("goalsCompleted", 0);
        int goalsTotal = prefs.getInt("goalsTotal", 0);
        int tasksCompleted = prefs.getInt("tasksCompleted", 0);
        int tasksTotal = prefs.getInt("tasksTotal", 0);
        int activitiesCompleted = prefs.getInt("activitiesCompleted", 0);
        int activitiesTotal = prefs.getInt("activitiesTotal", 0);
        int notificationsRead = prefs.getInt("notificationsRead", 0);
        int notificationsTotal = prefs.getInt("notificationsTotal", 0);

        // Update views with cached data
        updateWidgetViews(context, views,
            goalsCompleted, goalsTotal,
            tasksCompleted, tasksTotal,
            activitiesCompleted, activitiesTotal,
            notificationsRead, notificationsTotal);

        // Set click listener to open app
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
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
            int goalsCompleted, int goalsTotal,
            int tasksCompleted, int tasksTotal,
            int activitiesCompleted, int activitiesTotal,
            int notificationsRead, int notificationsTotal) {
        // Update all 4 stat counts in "completed/total" format for mini dashboard
        views.setTextViewText(R.id.widget_goals_count, goalsCompleted + "/" + goalsTotal);
        views.setTextViewText(R.id.widget_tasks_count, tasksCompleted + "/" + tasksTotal);
        views.setTextViewText(R.id.widget_activities_count, activitiesCompleted + "/" + activitiesTotal);
        views.setTextViewText(R.id.widget_groups_count, notificationsRead + "/" + notificationsTotal);
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

                    // Parse new API response format with completed/total for each metric
                    int goalsCompleted = json.optInt("goalsCompleted", 0);
                    int goalsTotal = json.optInt("goalsTotal", 0);
                    int tasksCompleted = json.optInt("tasksCompleted", 0);
                    int tasksTotal = json.optInt("tasksTotal", 0);
                    int activitiesCompleted = json.optInt("activitiesCompleted", 0);
                    int activitiesTotal = json.optInt("activitiesTotal", 0);
                    int notificationsRead = json.optInt("notificationsRead", 0);
                    int notificationsTotal = json.optInt("notificationsTotal", 0);

                    // Cache the data
                    SharedPreferences widgetPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                    widgetPrefs.edit()
                        .putInt("goalsCompleted", goalsCompleted)
                        .putInt("goalsTotal", goalsTotal)
                        .putInt("tasksCompleted", tasksCompleted)
                        .putInt("tasksTotal", tasksTotal)
                        .putInt("activitiesCompleted", activitiesCompleted)
                        .putInt("activitiesTotal", activitiesTotal)
                        .putInt("notificationsRead", notificationsRead)
                        .putInt("notificationsTotal", notificationsTotal)
                        .putLong("lastFetchTime", System.currentTimeMillis())
                        .apply();

                    // Update widget on main thread
                    mainHandler.post(() -> {
                        RemoteViews views = new RemoteViews(context.getPackageName(), getLayoutId());
                        updateWidgetViews(context, views,
                            goalsCompleted, goalsTotal,
                            tasksCompleted, tasksTotal,
                            activitiesCompleted, activitiesTotal,
                            notificationsRead, notificationsTotal);

                        // Re-set click listener
                        Intent intent = new Intent(context, MainActivity.class);
                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        PendingIntent pendingIntent = PendingIntent.getActivity(
                            context, appWidgetId, intent,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                        );
                        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);

                        appWidgetManager.updateAppWidget(appWidgetId, views);
                        Log.d(TAG, "Widget updated with fresh data: goals=" + goalsCompleted + "/" + goalsTotal +
                              ", tasks=" + tasksCompleted + "/" + tasksTotal +
                              ", activities=" + activitiesCompleted + "/" + activitiesTotal +
                              ", notifications=" + notificationsRead + "/" + notificationsTotal);
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
