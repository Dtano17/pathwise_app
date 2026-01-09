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
 * v2 - Updated for new dark navy design with 4 metrics:
 * Goals, Tasks, Activities, Groups (no progress rings)
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
        int goalsCount = prefs.getInt("goalsCount", 0);
        int tasksCount = prefs.getInt("tasksCount", 0);
        int activitiesCount = prefs.getInt("activitiesCount", 0);
        int groupsCount = prefs.getInt("groupsCount", 0);

        // Update views with cached data
        updateWidgetViews(context, views, goalsCount, tasksCount, activitiesCount, groupsCount);

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

    protected void updateWidgetViews(Context context, RemoteViews views, int goals, int tasks, int activities, int groups) {
        // Update all 4 stat counts
        views.setTextViewText(R.id.widget_goals_count, String.valueOf(goals));
        views.setTextViewText(R.id.widget_tasks_count, String.valueOf(tasks));
        views.setTextViewText(R.id.widget_activities_count, String.valueOf(activities));
        views.setTextViewText(R.id.widget_groups_count, String.valueOf(groups));
    }

    protected void fetchWidgetData(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String userId = prefs.getString("userId", null);

        if (userId == null) {
            // Try alternative storage location
            SharedPreferences altPrefs = context.getSharedPreferences("journalmate_prefs", Context.MODE_PRIVATE);
            userId = altPrefs.getString("userId", null);
        }

        if (userId == null) {
            Log.d(TAG, "No user ID found, skipping data fetch");
            return;
        }

        final String finalUserId = userId;

        executor.execute(() -> {
            try {
                URL url = new URL(API_BASE_URL + "/api/tasks/widget");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("X-User-ID", finalUserId);
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

                    // Parse new API response format
                    int goalsCount = json.optInt("goalsCount", 0);
                    int tasksCount = json.optInt("tasksCount", 0);
                    int activitiesCount = json.optInt("activitiesCount", 0);
                    int groupsCount = json.optInt("groupsCount", 0);

                    // Cache the data
                    SharedPreferences widgetPrefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                    widgetPrefs.edit()
                        .putInt("goalsCount", goalsCount)
                        .putInt("tasksCount", tasksCount)
                        .putInt("activitiesCount", activitiesCount)
                        .putInt("groupsCount", groupsCount)
                        .putLong("lastFetchTime", System.currentTimeMillis())
                        .apply();

                    // Update widget on main thread
                    mainHandler.post(() -> {
                        RemoteViews views = new RemoteViews(context.getPackageName(), getLayoutId());
                        updateWidgetViews(context, views, goalsCount, tasksCount, activitiesCount, groupsCount);

                        // Re-set click listener
                        Intent intent = new Intent(context, MainActivity.class);
                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        PendingIntent pendingIntent = PendingIntent.getActivity(
                            context, appWidgetId, intent,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                        );
                        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);

                        appWidgetManager.updateAppWidget(appWidgetId, views);
                        Log.d(TAG, "Widget updated with fresh data: goals=" + goalsCount +
                              ", tasks=" + tasksCount + ", activities=" + activitiesCount +
                              ", groups=" + groupsCount);
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
