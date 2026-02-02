package ai.journalmate.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import android.graphics.Color;
import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Firebase Cloud Messaging Service for JournalMate
 * Handles FCM token registration and incoming push notifications
 */
public class JournalMateFCMService extends FirebaseMessagingService {
    private static final String TAG = "JournalMateFCM";
    private static final String CHANNEL_ID = "journalmate_push";
    private static final String CHANNEL_NAME = "JournalMate Notifications";
    private static final String PREFS_NAME = "journalmate_prefs";
    private static final String API_BASE_URL = "https://journalmate.ai";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        Log.d(TAG, "New FCM token received: " + token);

        // Store token locally
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString("fcmToken", token).apply();

        // Send token to server
        sendTokenToServer(token);
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "Message received from: " + remoteMessage.getFrom());

        // Check if message contains a notification payload
        if (remoteMessage.getNotification() != null) {
            String title = remoteMessage.getNotification().getTitle();
            String body = remoteMessage.getNotification().getBody();
            Log.d(TAG, "Notification - Title: " + title + ", Body: " + body);
            showNotification(title, body, null);
        }

        // Check if message contains data payload
        Map<String, String> data = remoteMessage.getData();
        if (!data.isEmpty()) {
            Log.d(TAG, "Data payload: " + data);

            String title = data.get("title");
            String body = data.get("body");
            String activityId = data.get("activityId");
            String type = data.get("type");

            if (title != null && body != null) {
                showNotification(title, body, activityId);
            }
        }
    }

    /**
     * Send the FCM token to the server for storage
     */
    private void sendTokenToServer(String token) {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String userId = prefs.getString("userId", null);

        if (userId == null) {
            Log.w(TAG, "No userId found, cannot register token with server");
            return;
        }

        executor.execute(() -> {
            try {
                URL url = new URL(API_BASE_URL + "/api/user/device-token");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("X-User-ID", userId);
                conn.setDoOutput(true);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);

                String jsonPayload = String.format(
                    "{\"token\":\"%s\",\"platform\":\"android\",\"deviceName\":\"Android Device\"}",
                    token
                );

                OutputStream os = conn.getOutputStream();
                os.write(jsonPayload.getBytes());
                os.flush();
                os.close();

                int responseCode = conn.getResponseCode();
                if (responseCode == 200 || responseCode == 201) {
                    Log.d(TAG, "Token successfully registered with server");
                } else {
                    Log.e(TAG, "Failed to register token. Response code: " + responseCode);
                }
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "Error sending token to server: " + e.getMessage());
            }
        });
    }

    /**
     * Display a notification to the user
     */
    private void showNotification(String title, String body, String activityId) {
        createNotificationChannel();

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);

        // Add activity ID if provided for deep linking
        if (activityId != null) {
            intent.putExtra("activityId", activityId);
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );

        // Purple accent color matching widget design (#8b5cf6)
        int accentColor = Color.parseColor("#8b5cf6");

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title != null ? title : "JournalMate")
            .setContentText(body != null ? body : "")
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setColor(accentColor)
            .setColorized(true);

        NotificationManager notificationManager =
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        // Use unique ID based on timestamp
        int notificationId = (int) System.currentTimeMillis();
        notificationManager.notify(notificationId, builder.build());

        Log.d(TAG, "Notification displayed with ID: " + notificationId);
    }

    /**
     * Create notification channel for Android O and above
     */
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("JournalMate activity reminders and updates");
            channel.enableLights(true);
            channel.enableVibration(true);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);

            Log.d(TAG, "Notification channel created: " + CHANNEL_ID);
        }
    }
}
