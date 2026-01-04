package ai.journalmate.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

public class MainActivity extends BridgeActivity {

    // Store incoming intent for cold start
    private static String pendingShareData = null;
    // Store pending deep link auth token for OAuth callback
    private static String pendingAuthToken = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Configure system bars to NOT use edge-to-edge (content stays within safe bounds)
        configureSystemBars();

        // Register our Share plugin
        registerPlugin(SharePlugin.class);

        // Handle intent (share intents and deep links)
        handleIncomingIntent(getIntent());
    }

    /**
     * Configure system bars to use solid colors and prevent content bleeding
     */
    private void configureSystemBars() {
        Window window = getWindow();

        // Ensure we're not in edge-to-edge mode - content should not go behind system bars
        WindowCompat.setDecorFitsSystemWindows(window, true);

        // Set status bar and navigation bar colors
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.setStatusBarColor(getResources().getColor(R.color.colorPrimaryDark, getTheme()));
            window.setNavigationBarColor(getResources().getColor(R.color.colorPrimaryDark, getTheme()));
        }

        // Configure status bar icon colors (light icons for dark background)
        WindowInsetsControllerCompat windowInsetsController =
            WindowCompat.getInsetsController(window, window.getDecorView());
        if (windowInsetsController != null) {
            // false = light icons (for dark status bar background)
            windowInsetsController.setAppearanceLightStatusBars(false);
            windowInsetsController.setAppearanceLightNavigationBars(false);
        }
    }
    
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingIntent(intent);
    }
    
    private void handleIncomingIntent(Intent intent) {
        String action = intent.getAction();
        String type = intent.getType();

        // Handle deep links (OAuth callbacks, etc.)
        if (Intent.ACTION_VIEW.equals(action)) {
            Uri data = intent.getData();
            if (data != null) {
                handleDeepLink(data);
                return;
            }
        }

        // Handle share intents
        if (Intent.ACTION_SEND.equals(action) && type != null) {
            if ("text/plain".equals(type)) {
                handleSendText(intent);
            } else if (type.startsWith("image/")) {
                handleSendImage(intent);
            } else if (type.startsWith("video/")) {
                handleSendVideo(intent);
            }
        } else if (Intent.ACTION_SEND_MULTIPLE.equals(action) && type != null) {
            if (type.startsWith("image/")) {
                handleSendMultipleImages(intent);
            } else if (type.startsWith("video/")) {
                handleSendMultipleVideos(intent);
            }
        }
    }

    /**
     * Handle deep links including OAuth callbacks
     * journalmate://auth?token=xxx - OAuth callback with auth token
     */
    private void handleDeepLink(Uri uri) {
        String scheme = uri.getScheme();
        String host = uri.getHost();

        android.util.Log.d("MainActivity", "Deep link received: " + uri.toString());

        // Handle journalmate://auth?token=xxx (OAuth callback)
        if ("journalmate".equals(scheme) && "auth".equals(host)) {
            String token = uri.getQueryParameter("token");
            if (token != null && !token.isEmpty()) {
                android.util.Log.d("MainActivity", "OAuth auth token received via deep link");
                pendingAuthToken = token;
                // Notify the WebView via JavaScript event
                notifyAuthDeepLink(token);
            }
        }
        // Handle other deep links (journalmate://share/xxx, etc.)
        else if ("journalmate".equals(scheme)) {
            // Let the WebView handle other deep links via standard URL routing
            String path = uri.getPath();
            String query = uri.getQuery();
            String webUrl = path != null ? path : "/";
            if (query != null && !query.isEmpty()) {
                webUrl += "?" + query;
            }
            // Navigate WebView to the path
            if (this.getBridge() != null && this.getBridge().getWebView() != null) {
                final String finalUrl = webUrl;
                runOnUiThread(() -> {
                    this.getBridge().getWebView().loadUrl("javascript:window.location.href='" + finalUrl + "'");
                });
            }
        }
    }

    /**
     * Notify the WebView about OAuth auth token received via deep link
     */
    private void notifyAuthDeepLink(String token) {
        // Method 1: Try Capacitor bridge (works for local assets)
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            String js = String.format(
                "window.dispatchEvent(new CustomEvent('authDeepLink', { detail: { token: '%s' } }));",
                escapeJson(token)
            );
            runOnUiThread(() -> {
                this.getBridge().getWebView().evaluateJavascript(js, null);
            });
            android.util.Log.d("MainActivity", "OAuth token dispatched via Capacitor bridge");
        }

        // Method 2: Navigate to URL with token (works for remote URLs like journalmate.ai)
        // This ensures the web app receives the token even without Capacitor bridge
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            runOnUiThread(() -> {
                // Navigate to root with token parameter - the web app will handle it
                String authUrl = "/?token=" + token;
                this.getBridge().getWebView().loadUrl("javascript:window.location.href='" + authUrl + "'");
                android.util.Log.d("MainActivity", "OAuth token passed via URL navigation");
            });
        }
    }

    /**
     * Get pending auth token for cold start OAuth callback
     */
    public static String getPendingAuthToken() {
        String token = pendingAuthToken;
        pendingAuthToken = null; // Clear after retrieval
        return token;
    }
    
    private void handleSendText(Intent intent) {
        String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
        String sharedSubject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        
        if (sharedText != null) {
            String shareJson = String.format(
                "{\"type\":\"text\",\"text\":\"%s\",\"title\":\"%s\"}",
                escapeJson(sharedText),
                escapeJson(sharedSubject != null ? sharedSubject : "")
            );
            
            // Store for cold start AND notify if bridge ready
            pendingShareData = shareJson;
            notifyBridge(shareJson);
        }
    }
    
    private void handleSendImage(Intent intent) {
        android.net.Uri imageUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        String captionText = intent.getStringExtra(Intent.EXTRA_TEXT);
        String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        
        if (imageUri != null) {
            String shareJson = String.format(
                "{\"type\":\"image\",\"mediaType\":\"image\",\"files\":[\"%s\"],\"caption\":\"%s\",\"title\":\"%s\"}",
                escapeJson(imageUri.toString()),
                escapeJson(captionText != null ? captionText : ""),
                escapeJson(subject != null ? subject : "")
            );
            
            // Store for cold start AND notify if bridge ready
            pendingShareData = shareJson;
            notifyBridge(shareJson);
        }
    }
    
    private void handleSendVideo(Intent intent) {
        android.net.Uri videoUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        String captionText = intent.getStringExtra(Intent.EXTRA_TEXT);
        String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        
        if (videoUri != null) {
            String shareJson = String.format(
                "{\"type\":\"video\",\"mediaType\":\"video\",\"files\":[\"%s\"],\"caption\":\"%s\",\"title\":\"%s\"}",
                escapeJson(videoUri.toString()),
                escapeJson(captionText != null ? captionText : ""),
                escapeJson(subject != null ? subject : "")
            );
            
            // Store for cold start AND notify if bridge ready
            pendingShareData = shareJson;
            notifyBridge(shareJson);
        }
    }
    
    private void handleSendMultipleImages(Intent intent) {
        java.util.ArrayList<android.net.Uri> imageUris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
        String captionText = intent.getStringExtra(Intent.EXTRA_TEXT);
        
        if (imageUris != null) {
            StringBuilder filesJson = new StringBuilder("[");
            for (int i = 0; i < imageUris.size(); i++) {
                if (i > 0) filesJson.append(",");
                filesJson.append("\"").append(escapeJson(imageUris.get(i).toString())).append("\"");
            }
            filesJson.append("]");
            
            String shareJson = String.format(
                "{\"type\":\"image\",\"mediaType\":\"image\",\"files\":%s,\"caption\":\"%s\"}",
                filesJson.toString(),
                escapeJson(captionText != null ? captionText : "")
            );
            
            // Store for cold start AND notify if bridge ready
            pendingShareData = shareJson;
            notifyBridge(shareJson);
        }
    }
    
    private void handleSendMultipleVideos(Intent intent) {
        java.util.ArrayList<android.net.Uri> videoUris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
        String captionText = intent.getStringExtra(Intent.EXTRA_TEXT);
        
        if (videoUris != null) {
            StringBuilder filesJson = new StringBuilder("[");
            for (int i = 0; i < videoUris.size(); i++) {
                if (i > 0) filesJson.append(",");
                filesJson.append("\"").append(escapeJson(videoUris.get(i).toString())).append("\"");
            }
            filesJson.append("]");
            
            String shareJson = String.format(
                "{\"type\":\"video\",\"mediaType\":\"video\",\"files\":%s,\"caption\":\"%s\"}",
                filesJson.toString(),
                escapeJson(captionText != null ? captionText : "")
            );
            
            // Store for cold start AND notify if bridge ready
            pendingShareData = shareJson;
            notifyBridge(shareJson);
        }
    }
    
    private void notifyBridge(String shareJson) {
        // Only notify if bridge is ready (app in foreground)
        if (this.getBridge() != null) {
            this.getBridge().triggerJSEvent("incomingShare", shareJson);
        }
    }
    
    public static String getPendingShareData() {
        String data = pendingShareData;
        pendingShareData = null; // Clear after retrieval
        return data;
    }
    
    private String escapeJson(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\")
                   .replace("\"", "\\\"")
                   .replace("\n", "\\n")
                   .replace("\r", "\\r")
                   .replace("\t", "\\t");
    }
}
