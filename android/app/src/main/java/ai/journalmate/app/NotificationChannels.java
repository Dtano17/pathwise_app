package ai.journalmate.app;

import android.app.NotificationChannel;
import android.app.NotificationChannelGroup;
import android.app.NotificationManager;
import android.content.Context;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

/**
 * Centralized notification channel management for JournalMate
 *
 * Creates professional notification channels with:
 * - Custom vibration patterns per priority
 * - LED colors (purple brand color)
 * - Appropriate importance levels
 * - Channel groups for organization in system settings
 */
public class NotificationChannels {
    private static final String TAG = "NotificationChannels";

    // Brand color for LEDs
    private static final int BRAND_COLOR = Color.parseColor("#8B5CF6");

    // Channel Group IDs
    public static final String GROUP_PLANNING = "journalmate_planning";
    public static final String GROUP_SOCIAL = "journalmate_social";
    public static final String GROUP_ACHIEVEMENTS = "journalmate_achievements_group";
    public static final String GROUP_ASSISTANT = "journalmate_assistant_group";

    // Channel IDs - must match server/services/notificationTemplates.ts
    public static final String CHANNEL_TASKS = "journalmate_tasks";
    public static final String CHANNEL_ACTIVITIES = "journalmate_activities";
    public static final String CHANNEL_GROUPS = "journalmate_groups";
    public static final String CHANNEL_STREAKS = "journalmate_streaks";
    public static final String CHANNEL_ACHIEVEMENTS = "journalmate_achievements";
    public static final String CHANNEL_ASSISTANT = "journalmate_assistant";
    public static final String CHANNEL_ALERTS = "journalmate_alerts";

    // Vibration patterns (in milliseconds)
    // Pattern format: [delay, vibrate, pause, vibrate, ...]
    public static final long[] VIBRATION_LIGHT = {0, 50};
    public static final long[] VIBRATION_MEDIUM = {0, 100, 50, 100};
    public static final long[] VIBRATION_HEAVY = {0, 200, 100, 200};
    public static final long[] VIBRATION_CELEBRATION = {0, 100, 50, 100, 50, 200, 100, 300};
    public static final long[] VIBRATION_URGENT = {0, 300, 100, 300, 100, 300};

    /**
     * Create all notification channels and groups
     * Should be called when app starts (e.g., in MainActivity.onCreate or Application.onCreate)
     */
    public static void createAllChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            Log.d(TAG, "Skipping channel creation - API level below 26");
            return;
        }

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) {
            Log.e(TAG, "NotificationManager is null");
            return;
        }

        // Create channel groups first
        createChannelGroups(manager);

        // Create individual channels
        createTasksChannel(manager);
        createActivitiesChannel(manager);
        createGroupsChannel(manager);
        createStreaksChannel(manager);
        createAchievementsChannel(manager);
        createAssistantChannel(manager);
        createAlertsChannel(manager);

        Log.d(TAG, "All notification channels created successfully");
    }

    private static void createChannelGroups(NotificationManager manager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        manager.createNotificationChannelGroup(
            new NotificationChannelGroup(GROUP_PLANNING, "Planning & Tasks")
        );
        manager.createNotificationChannelGroup(
            new NotificationChannelGroup(GROUP_SOCIAL, "Groups & Social")
        );
        manager.createNotificationChannelGroup(
            new NotificationChannelGroup(GROUP_ACHIEVEMENTS, "Achievements & Streaks")
        );
        manager.createNotificationChannelGroup(
            new NotificationChannelGroup(GROUP_ASSISTANT, "Smart Assistant")
        );

        Log.d(TAG, "Channel groups created");
    }

    /**
     * Tasks Channel - High priority for due dates and reminders
     */
    private static void createTasksChannel(NotificationManager manager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_TASKS,
            "Task Reminders",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Reminders for upcoming and overdue tasks");
        channel.setGroup(GROUP_PLANNING);
        channel.enableVibration(true);
        channel.setVibrationPattern(VIBRATION_MEDIUM);
        channel.enableLights(true);
        channel.setLightColor(BRAND_COLOR);
        channel.setShowBadge(true);
        channel.setBypassDnd(false);

        manager.createNotificationChannel(channel);
        Log.d(TAG, "Tasks channel created: " + CHANNEL_TASKS);
    }

    /**
     * Activities Channel - Trip and activity reminders
     */
    private static void createActivitiesChannel(NotificationManager manager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ACTIVITIES,
            "Activity Updates",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Updates about your planned activities and trips");
        channel.setGroup(GROUP_PLANNING);
        channel.enableVibration(true);
        channel.setVibrationPattern(VIBRATION_MEDIUM);
        channel.enableLights(true);
        channel.setLightColor(BRAND_COLOR);
        channel.setShowBadge(true);

        manager.createNotificationChannel(channel);
        Log.d(TAG, "Activities channel created: " + CHANNEL_ACTIVITIES);
    }

    /**
     * Groups Channel - Social notifications, invites, member updates
     */
    private static void createGroupsChannel(NotificationManager manager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_GROUPS,
            "Group Activity",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Invites, joins, and updates from your groups");
        channel.setGroup(GROUP_SOCIAL);
        channel.enableVibration(true);
        channel.setVibrationPattern(VIBRATION_HEAVY);  // Heavier for social importance
        channel.enableLights(true);
        channel.setLightColor(BRAND_COLOR);
        channel.setShowBadge(true);

        manager.createNotificationChannel(channel);
        Log.d(TAG, "Groups channel created: " + CHANNEL_GROUPS);
    }

    /**
     * Streaks Channel - Streak reminders and at-risk alerts
     */
    private static void createStreaksChannel(NotificationManager manager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_STREAKS,
            "Streak Reminders",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("Reminders to maintain your activity streaks");
        channel.setGroup(GROUP_ACHIEVEMENTS);
        channel.enableVibration(true);
        channel.setVibrationPattern(VIBRATION_MEDIUM);
        channel.enableLights(true);
        channel.setLightColor(BRAND_COLOR);
        channel.setShowBadge(true);

        manager.createNotificationChannel(channel);
        Log.d(TAG, "Streaks channel created: " + CHANNEL_STREAKS);
    }

    /**
     * Achievements Channel - Milestone celebrations
     */
    private static void createAchievementsChannel(NotificationManager manager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ACHIEVEMENTS,
            "Achievements",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("Milestone celebrations and badge unlocks");
        channel.setGroup(GROUP_ACHIEVEMENTS);
        channel.enableVibration(true);
        channel.setVibrationPattern(VIBRATION_CELEBRATION);  // Celebration pattern
        channel.enableLights(true);
        channel.setLightColor(BRAND_COLOR);
        channel.setShowBadge(true);

        manager.createNotificationChannel(channel);
        Log.d(TAG, "Achievements channel created: " + CHANNEL_ACHIEVEMENTS);
    }

    /**
     * Assistant Channel - Smart suggestions and check-ins (lower priority)
     */
    private static void createAssistantChannel(NotificationManager manager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ASSISTANT,
            "Smart Assistant",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Suggestions, tips, and check-in reminders");
        channel.setGroup(GROUP_ASSISTANT);
        channel.enableVibration(false);  // Silent for low priority
        channel.enableLights(true);
        channel.setLightColor(BRAND_COLOR);
        channel.setShowBadge(false);

        manager.createNotificationChannel(channel);
        Log.d(TAG, "Assistant channel created: " + CHANNEL_ASSISTANT);
    }

    /**
     * Alerts Channel - General high-priority alerts
     */
    private static void createAlertsChannel(NotificationManager manager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ALERTS,
            "Important Alerts",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Important alerts and reminders");
        channel.setGroup(GROUP_PLANNING);
        channel.enableVibration(true);
        channel.setVibrationPattern(VIBRATION_URGENT);
        channel.enableLights(true);
        channel.setLightColor(BRAND_COLOR);
        channel.setShowBadge(true);
        channel.setBypassDnd(false);

        manager.createNotificationChannel(channel);
        Log.d(TAG, "Alerts channel created: " + CHANNEL_ALERTS);
    }

    /**
     * Get the vibration pattern for a haptic type
     *
     * @param hapticType One of: "light", "medium", "heavy", "celebration", "urgent"
     * @return Vibration pattern array
     */
    public static long[] getVibrationPattern(String hapticType) {
        if (hapticType == null) {
            return VIBRATION_MEDIUM;
        }

        switch (hapticType.toLowerCase()) {
            case "light":
                return VIBRATION_LIGHT;
            case "medium":
                return VIBRATION_MEDIUM;
            case "heavy":
                return VIBRATION_HEAVY;
            case "celebration":
                return VIBRATION_CELEBRATION;
            case "urgent":
                return VIBRATION_URGENT;
            default:
                return VIBRATION_MEDIUM;
        }
    }

    /**
     * Get the channel ID for a notification type/category
     * Maps server notification types to Android channels
     *
     * @param notificationType The type from server (e.g., "task_due_soon", "group_invite_received")
     * @return Channel ID to use
     */
    public static String getChannelForType(String notificationType) {
        if (notificationType == null) {
            return CHANNEL_ALERTS;
        }

        // Task-related
        if (notificationType.startsWith("task_")) {
            return CHANNEL_TASKS;
        }

        // Activity-related
        if (notificationType.startsWith("activity_") ||
            notificationType.startsWith("timeline_") ||
            notificationType.startsWith("trip_") ||
            notificationType.startsWith("reservation_") ||
            notificationType.startsWith("flight_") ||
            notificationType.startsWith("hotel_") ||
            notificationType.startsWith("movie_") ||
            notificationType.startsWith("show_")) {
            return CHANNEL_ACTIVITIES;
        }

        // Group-related
        if (notificationType.startsWith("group_")) {
            return CHANNEL_GROUPS;
        }

        // Streak-related
        if (notificationType.startsWith("streak_")) {
            if (notificationType.contains("milestone")) {
                return CHANNEL_ACHIEVEMENTS;
            }
            return CHANNEL_STREAKS;
        }

        // Goal-related (goes to tasks channel)
        if (notificationType.startsWith("goal_")) {
            return CHANNEL_TASKS;
        }

        // Accountability check-ins
        if (notificationType.contains("checkin") ||
            notificationType.contains("review") ||
            notificationType.startsWith("weekly_") ||
            notificationType.startsWith("monthly_") ||
            notificationType.startsWith("quarterly_")) {
            return CHANNEL_ASSISTANT;
        }

        // Assistant/suggestions
        if (notificationType.startsWith("suggested_") ||
            notificationType.startsWith("idle_") ||
            notificationType.startsWith("unfinished_") ||
            notificationType.startsWith("weather_") ||
            notificationType.startsWith("calendar_")) {
            return CHANNEL_ASSISTANT;
        }

        // Journal-related
        if (notificationType.startsWith("journal_") ||
            notificationType.contains("journal")) {
            return CHANNEL_ASSISTANT;
        }

        // Default to alerts for unknown types
        return CHANNEL_ALERTS;
    }

    /**
     * Get the importance level for a notification priority
     *
     * @param priority "low", "default", or "high"
     * @return NotificationManager importance constant
     */
    public static int getImportanceLevel(String priority) {
        if (priority == null) {
            return NotificationManager.IMPORTANCE_DEFAULT;
        }

        switch (priority.toLowerCase()) {
            case "low":
                return NotificationManager.IMPORTANCE_LOW;
            case "high":
                return NotificationManager.IMPORTANCE_HIGH;
            case "default":
            default:
                return NotificationManager.IMPORTANCE_DEFAULT;
        }
    }
}
