package ai.journalmate.app;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ShortcutInfo;
import android.content.pm.ShortcutManager;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "NativeAppShortcuts")
public class AppShortcutsPlugin extends Plugin {
    private static final String TAG = "AppShortcutsPlugin";

    /**
     * Check if dynamic shortcuts are supported
     */
    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject result = new JSObject();
        result.put("supported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.N_MR1);
        call.resolve(result);
    }

    /**
     * Set dynamic shortcuts (replaces existing ones)
     */
    @PluginMethod
    public void setShortcuts(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) {
            call.reject("Shortcuts not supported on this Android version");
            return;
        }

        JSArray shortcuts = call.getArray("shortcuts");
        if (shortcuts == null) {
            call.reject("No shortcuts provided");
            return;
        }

        try {
            ShortcutManager shortcutManager = getContext().getSystemService(ShortcutManager.class);
            List<ShortcutInfo> shortcutInfoList = new ArrayList<>();

            for (int i = 0; i < shortcuts.length(); i++) {
                JSONObject shortcut = shortcuts.getJSONObject(i);
                ShortcutInfo shortcutInfo = createShortcutInfo(shortcut);
                if (shortcutInfo != null) {
                    shortcutInfoList.add(shortcutInfo);
                }
            }

            shortcutManager.setDynamicShortcuts(shortcutInfoList);
            Log.d(TAG, "Set " + shortcutInfoList.size() + " dynamic shortcuts");

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("count", shortcutInfoList.size());
            call.resolve(result);

        } catch (JSONException e) {
            Log.e(TAG, "Failed to parse shortcuts: " + e.getMessage());
            call.reject("Failed to parse shortcuts: " + e.getMessage());
        }
    }

    /**
     * Add a single shortcut
     */
    @PluginMethod
    public void addShortcut(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) {
            call.reject("Shortcuts not supported on this Android version");
            return;
        }

        String id = call.getString("id");
        String shortLabel = call.getString("shortLabel");
        String longLabel = call.getString("longLabel", shortLabel);
        String action = call.getString("action");
        String iconName = call.getString("icon", "ic_shortcut_default");

        if (id == null || shortLabel == null || action == null) {
            call.reject("Missing required fields: id, shortLabel, action");
            return;
        }

        try {
            ShortcutManager shortcutManager = getContext().getSystemService(ShortcutManager.class);

            Intent intent = new Intent(getContext(), MainActivity.class);
            intent.setAction(action);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            int iconResId = getIconResourceId(iconName);

            ShortcutInfo.Builder builder = new ShortcutInfo.Builder(getContext(), id)
                .setShortLabel(shortLabel)
                .setLongLabel(longLabel)
                .setIntent(intent);

            if (iconResId != 0) {
                builder.setIcon(Icon.createWithResource(getContext(), iconResId));
            }

            ShortcutInfo shortcutInfo = builder.build();

            // Add to existing shortcuts
            List<ShortcutInfo> existing = shortcutManager.getDynamicShortcuts();
            List<ShortcutInfo> updated = new ArrayList<>(existing);

            // Remove if already exists (update)
            updated.removeIf(s -> s.getId().equals(id));
            updated.add(shortcutInfo);

            shortcutManager.setDynamicShortcuts(updated);

            Log.d(TAG, "Added shortcut: " + id);
            call.resolve(new JSObject().put("success", true));

        } catch (Exception e) {
            Log.e(TAG, "Failed to add shortcut: " + e.getMessage());
            call.reject("Failed to add shortcut: " + e.getMessage());
        }
    }

    /**
     * Remove a shortcut by ID
     */
    @PluginMethod
    public void removeShortcut(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) {
            call.reject("Shortcuts not supported on this Android version");
            return;
        }

        String id = call.getString("id");
        if (id == null) {
            call.reject("Shortcut ID is required");
            return;
        }

        try {
            ShortcutManager shortcutManager = getContext().getSystemService(ShortcutManager.class);
            List<String> idsToRemove = new ArrayList<>();
            idsToRemove.add(id);
            shortcutManager.removeDynamicShortcuts(idsToRemove);

            Log.d(TAG, "Removed shortcut: " + id);
            call.resolve(new JSObject().put("success", true));

        } catch (Exception e) {
            Log.e(TAG, "Failed to remove shortcut: " + e.getMessage());
            call.reject("Failed to remove shortcut: " + e.getMessage());
        }
    }

    /**
     * Get all current dynamic shortcuts
     */
    @PluginMethod
    public void getShortcuts(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) {
            call.resolve(new JSObject().put("shortcuts", new JSArray()));
            return;
        }

        try {
            ShortcutManager shortcutManager = getContext().getSystemService(ShortcutManager.class);
            List<ShortcutInfo> shortcuts = shortcutManager.getDynamicShortcuts();

            JSArray shortcutsArray = new JSArray();
            for (ShortcutInfo shortcut : shortcuts) {
                JSObject obj = new JSObject();
                obj.put("id", shortcut.getId());
                obj.put("shortLabel", shortcut.getShortLabel());
                obj.put("longLabel", shortcut.getLongLabel());
                shortcutsArray.put(obj);
            }

            JSObject result = new JSObject();
            result.put("shortcuts", shortcutsArray);
            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Failed to get shortcuts: " + e.getMessage());
            call.reject("Failed to get shortcuts: " + e.getMessage());
        }
    }

    /**
     * Setup default app shortcuts for JournalMate
     */
    @PluginMethod
    public void setupDefaultShortcuts(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N_MR1) {
            call.resolve(new JSObject().put("success", false).put("reason", "Not supported"));
            return;
        }

        try {
            ShortcutManager shortcutManager = getContext().getSystemService(ShortcutManager.class);
            List<ShortcutInfo> shortcuts = new ArrayList<>();

            // Quick Journal shortcut
            Intent journalIntent = new Intent(getContext(), MainActivity.class);
            journalIntent.setAction("QUICK_JOURNAL");
            journalIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            ShortcutInfo journalShortcut = new ShortcutInfo.Builder(getContext(), "quick_journal")
                .setShortLabel("Quick Journal")
                .setLongLabel("Write a journal entry")
                .setIcon(Icon.createWithResource(getContext(), R.drawable.ic_shortcut_journal))
                .setIntent(journalIntent)
                .build();
            shortcuts.add(journalShortcut);

            // Add Task shortcut
            Intent taskIntent = new Intent(getContext(), MainActivity.class);
            taskIntent.setAction("ADD_TASK");
            taskIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            ShortcutInfo taskShortcut = new ShortcutInfo.Builder(getContext(), "add_task")
                .setShortLabel("Add Task")
                .setLongLabel("Create a new task")
                .setIcon(Icon.createWithResource(getContext(), R.drawable.ic_shortcut_task))
                .setIntent(taskIntent)
                .build();
            shortcuts.add(taskShortcut);

            // View Today shortcut
            Intent todayIntent = new Intent(getContext(), MainActivity.class);
            todayIntent.setAction("VIEW_TODAY");
            todayIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            ShortcutInfo todayShortcut = new ShortcutInfo.Builder(getContext(), "view_today")
                .setShortLabel("Today")
                .setLongLabel("View today's tasks")
                .setIcon(Icon.createWithResource(getContext(), R.drawable.ic_shortcut_today))
                .setIntent(todayIntent)
                .build();
            shortcuts.add(todayShortcut);

            // View Activities shortcut
            Intent activitiesIntent = new Intent(getContext(), MainActivity.class);
            activitiesIntent.setAction("VIEW_ACTIVITIES");
            activitiesIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            ShortcutInfo activitiesShortcut = new ShortcutInfo.Builder(getContext(), "view_activities")
                .setShortLabel("Activities")
                .setLongLabel("View your activities")
                .setIcon(Icon.createWithResource(getContext(), R.drawable.ic_shortcut_activities))
                .setIntent(activitiesIntent)
                .build();
            shortcuts.add(activitiesShortcut);

            shortcutManager.setDynamicShortcuts(shortcuts);

            Log.d(TAG, "Setup " + shortcuts.size() + " default shortcuts");
            call.resolve(new JSObject().put("success", true).put("count", shortcuts.size()));

        } catch (Exception e) {
            Log.e(TAG, "Failed to setup default shortcuts: " + e.getMessage());
            call.reject("Failed to setup shortcuts: " + e.getMessage());
        }
    }

    /**
     * Helper to create ShortcutInfo from JSON
     */
    private ShortcutInfo createShortcutInfo(JSONObject json) {
        try {
            String id = json.getString("id");
            String shortLabel = json.getString("shortLabel");
            String longLabel = json.optString("longLabel", shortLabel);
            String action = json.getString("action");
            String iconName = json.optString("icon", "ic_shortcut_default");

            Intent intent = new Intent(getContext(), MainActivity.class);
            intent.setAction(action);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

            int iconResId = getIconResourceId(iconName);

            ShortcutInfo.Builder builder = new ShortcutInfo.Builder(getContext(), id)
                .setShortLabel(shortLabel)
                .setLongLabel(longLabel)
                .setIntent(intent);

            if (iconResId != 0) {
                builder.setIcon(Icon.createWithResource(getContext(), iconResId));
            }

            return builder.build();

        } catch (JSONException e) {
            Log.e(TAG, "Failed to parse shortcut JSON: " + e.getMessage());
            return null;
        }
    }

    /**
     * Get resource ID for icon name
     */
    private int getIconResourceId(String iconName) {
        try {
            return getContext().getResources().getIdentifier(
                iconName,
                "drawable",
                getContext().getPackageName()
            );
        } catch (Exception e) {
            return 0;
        }
    }
}
