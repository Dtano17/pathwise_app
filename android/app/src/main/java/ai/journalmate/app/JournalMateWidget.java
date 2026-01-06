package ai.journalmate.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.util.Log;

/**
 * JournalMate Home Screen Widget
 *
 * Displays a quick-access widget that opens the app when tapped.
 * Shows app branding and encourages engagement.
 */
public class JournalMateWidget extends AppWidgetProvider {

    private static final String TAG = "JournalMateWidget";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // Update each widget instance
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        Log.d(TAG, "Updating widget: " + appWidgetId);

        // Create RemoteViews for the widget layout
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_journalmate);

        // Create an intent to launch the app when widget is clicked
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Set click listener on the entire widget
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);

        // Update the widget
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onEnabled(Context context) {
        // Called when the first widget is created
        Log.d(TAG, "Widget enabled (first instance created)");
    }

    @Override
    public void onDisabled(Context context) {
        // Called when the last widget is removed
        Log.d(TAG, "Widget disabled (last instance removed)");
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        Log.d(TAG, "Widget received broadcast: " + intent.getAction());
    }
}
