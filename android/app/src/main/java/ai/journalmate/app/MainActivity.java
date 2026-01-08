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
    // Track if periodic token checker is currently running
    private boolean tokenCheckerActive = false;
    // Handler for periodic checks
    private android.os.Handler tokenCheckerHandler = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Configure system bars to NOT use edge-to-edge (content stays within safe bounds)
        configureSystemBars();

        // Register our custom plugins
        registerPlugin(SharePlugin.class);
        registerPlugin(NotificationPlugin.class);
        registerPlugin(BackgroundServicePlugin.class);

        // Handle intent (share intents and deep links)
        handleIncomingIntent(getIntent());
        
        // Schedule a check for pending auth tokens after WebView fully loads
        // This handles cold-start OAuth where the token arrives before WebView is ready
        schedulePendingTokenCheck();
    }
    
    /**
     * Schedule periodic checks for pending auth tokens until delivered or timeout
     * This ensures tokens are delivered even on slow cold starts
     * NOTE: pendingAuthToken is only cleared after successful loadUrl, not before
     * Can be called multiple times - will restart the checker if a new token arrives
     */
    private void schedulePendingTokenCheck() {
        // If checker already active, it will pick up the new token
        if (tokenCheckerActive) {
            android.util.Log.d("MainActivity", "Token checker already active, will pick up new token");
            return;
        }
        
        final int CHECK_INTERVAL_MS = 1000;
        final int MAX_CHECKS = 120; // Up to 120 seconds of checking (2 minutes)
        
        tokenCheckerHandler = new android.os.Handler(android.os.Looper.getMainLooper());
        final int[] checkCount = {0};
        tokenCheckerActive = true;
        
        Runnable tokenChecker = new Runnable() {
            @Override
            public void run() {
                checkCount[0]++;
                
                if (pendingAuthToken != null && getBridge() != null && getBridge().getWebView() != null) {
                    android.util.Log.d("MainActivity", "Pending token found on check #" + checkCount[0] + ", delivering...");
                    // Don't clear token here - directNavigateWithTokenConfirmed will clear it after success
                    directNavigateWithTokenConfirmed(pendingAuthToken);
                    // Check again to confirm token was cleared
                    tokenCheckerHandler.postDelayed(this, CHECK_INTERVAL_MS);
                } else if (pendingAuthToken != null && checkCount[0] < MAX_CHECKS) {
                    // Token pending but bridge not ready, check again later
                    tokenCheckerHandler.postDelayed(this, CHECK_INTERVAL_MS);
                } else if (pendingAuthToken != null) {
                    android.util.Log.w("MainActivity", "Token delivery timeout after " + MAX_CHECKS + " checks");
                    // Keep token - onResume will try again
                    tokenCheckerActive = false;
                } else {
                    // Token was delivered successfully
                    android.util.Log.d("MainActivity", "Token delivered, stopping checker");
                    tokenCheckerActive = false;
                }
            }
        };
        
        // Start checking after a short delay to allow initial setup
        tokenCheckerHandler.postDelayed(tokenChecker, CHECK_INTERVAL_MS);
    }
    
    @Override
    public void onResume() {
        super.onResume();
        // Check for pending auth token on every resume - handles cases where
        // token arrived but couldn't be delivered, and user returns to app
        if (pendingAuthToken != null) {
            android.util.Log.d("MainActivity", "onResume: Found pending auth token, attempting delivery");
            if (getBridge() != null && getBridge().getWebView() != null) {
                directNavigateWithTokenConfirmed(pendingAuthToken);
            } else {
                // Bridge not ready, start/restart the periodic checker
                schedulePendingTokenCheck();
            }
        }
    }
    
    /**
     * Directly navigate with token and only clear pendingAuthToken after success
     * This version confirms delivery before clearing the token
     */
    private void directNavigateWithTokenConfirmed(String token) {
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            runOnUiThread(() -> {
                try {
                    String baseUrl = "https://journalmate.ai";
                    String authUrl = baseUrl + "/?token=" + token;
                    android.util.Log.d("MainActivity", "Confirmed navigation to: " + authUrl);
                    this.getBridge().getWebView().loadUrl(authUrl);
                    
                    // Only clear after loadUrl succeeds (no exception thrown)
                    pendingAuthToken = null;
                    android.util.Log.d("MainActivity", "Token delivered and cleared successfully");
                } catch (Exception e) {
                    android.util.Log.e("MainActivity", "Confirmed navigation failed: " + e.getMessage());
                    // Don't clear token - keep it for next attempt
                }
            });
        }
        // If bridge not ready, don't clear token - periodic checker will try again
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

        // Handle app shortcuts and notification actions
        if (action != null) {
            switch (action) {
                case "ADD_TASK":
                    navigateToRoute("/tasks?action=add");
                    return;
                case "VIEW_TODAY":
                    navigateToRoute("/tasks?view=today");
                    return;
                case "QUICK_JOURNAL":
                    navigateToRoute("/journal?action=new");
                    return;
                case "VIEW_ACTIVITIES":
                    navigateToRoute("/activities");
                    return;
                case "VIEW_TASK":
                    String taskId = intent.getStringExtra("taskId");
                    if (taskId != null) {
                        navigateToRoute("/tasks/" + taskId);
                    }
                    return;
            }
        }

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
     * Navigate the WebView to a specific route via JavaScript
     */
    private void navigateToRoute(String route) {
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            final String fullUrl = "https://journalmate.ai" + route;
            runOnUiThread(() -> {
                try {
                    android.util.Log.d("MainActivity", "Navigating to: " + fullUrl);
                    this.getBridge().getWebView().loadUrl(fullUrl);
                } catch (Exception e) {
                    android.util.Log.e("MainActivity", "Navigation failed: " + e.getMessage());
                }
            });
        } else {
            // Store for when bridge is ready
            android.util.Log.d("MainActivity", "Bridge not ready, route pending: " + route);
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
                // Reset checker state so it can be restarted for this new token
                tokenCheckerActive = false;
                // Start/restart the periodic checker for this new token
                schedulePendingTokenCheck();
                // Also try immediate notification via JavaScript event
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
     * Uses multiple methods with retry logic to ensure token delivery
     */
    private void notifyAuthDeepLink(String token) {
        android.util.Log.d("MainActivity", "notifyAuthDeepLink called with token");
        
        // Store token for retry attempts
        pendingAuthToken = token;
        
        // Try immediate notification
        attemptTokenDelivery(token, 0);
    }
    
    /**
     * Attempt to deliver the auth token to the WebView
     * Retries up to 5 times with increasing delays if WebView isn't ready
     */
    private void attemptTokenDelivery(String token, int attemptNumber) {
        final int MAX_ATTEMPTS = 5;
        final int BASE_DELAY_MS = 500;
        
        if (attemptNumber >= MAX_ATTEMPTS) {
            android.util.Log.w("MainActivity", "Max token delivery attempts reached, using direct navigation");
            // Final fallback: directly load the URL with token
            directNavigateWithToken(token);
            return;
        }
        
        android.util.Log.d("MainActivity", "Token delivery attempt " + (attemptNumber + 1) + "/" + MAX_ATTEMPTS);
        
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            runOnUiThread(() -> {
                try {
                    // Method 1: Dispatch custom event (works when JS is ready)
                    String eventJs = String.format(
                        "(function() { " +
                        "  try { " +
                        "    window.dispatchEvent(new CustomEvent('authDeepLink', { detail: { token: '%s' } })); " +
                        "    console.log('[MainActivity] authDeepLink event dispatched'); " +
                        "    return 'dispatched'; " +
                        "  } catch(e) { " +
                        "    console.error('[MainActivity] Event dispatch failed:', e); " +
                        "    return 'failed'; " +
                        "  } " +
                        "})();",
                        escapeJson(token)
                    );
                    
                    this.getBridge().getWebView().evaluateJavascript(eventJs, (result) -> {
                        android.util.Log.d("MainActivity", "JS event result: " + result);
                        // Note: Event "dispatched" doesn't confirm listener received it
                        // Don't clear pendingAuthToken here - let directNavigate or periodic checker
                        // handle confirmed delivery
                    });
                    
                    // Method 2: Also navigate to URL with token (belt and suspenders)
                    // This handles cases where the event listener isn't set up yet
                    new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                        directNavigateWithToken(token);
                    }, 300);
                    
                } catch (Exception e) {
                    android.util.Log.e("MainActivity", "Token delivery failed: " + e.getMessage());
                    // Retry after delay
                    scheduleRetry(token, attemptNumber + 1, BASE_DELAY_MS * (attemptNumber + 1));
                }
            });
        } else {
            android.util.Log.d("MainActivity", "Bridge not ready, scheduling retry");
            // Bridge not ready, retry after delay
            scheduleRetry(token, attemptNumber + 1, BASE_DELAY_MS * (attemptNumber + 1));
        }
    }
    
    /**
     * Schedule a retry attempt for token delivery
     */
    private void scheduleRetry(String token, int nextAttempt, int delayMs) {
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            attemptTokenDelivery(token, nextAttempt);
        }, delayMs);
    }
    
    /**
     * Directly navigate the WebView to a URL with the token parameter
     * This is the most reliable method for remote URL WebViews
     * Includes retry logic if bridge isn't ready yet
     */
    private void directNavigateWithToken(String token) {
        directNavigateWithToken(token, 0);
    }
    
    private void directNavigateWithToken(String token, int retryCount) {
        // No longer capped - the periodic checker in schedulePendingTokenCheck handles the timeout
        // This method just tries once and lets the periodic checker handle retries
        final int NAVIGATION_RETRY_DELAY_MS = 500;
        
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            runOnUiThread(() -> {
                try {
                    // For remote URLs (journalmate.ai), navigate to the full URL with token
                    String baseUrl = "https://journalmate.ai";
                    String authUrl = baseUrl + "/?token=" + token;
                    android.util.Log.d("MainActivity", "Direct navigation to: " + authUrl);
                    this.getBridge().getWebView().loadUrl(authUrl);
                    
                    // Clear pending token only after successful loadUrl
                    pendingAuthToken = null;
                    android.util.Log.d("MainActivity", "Token delivered successfully via directNavigate");
                } catch (Exception e) {
                    android.util.Log.e("MainActivity", "Direct navigation failed: " + e.getMessage());
                    // Don't clear token - periodic checker will retry
                }
            });
        } else {
            // Bridge not ready - don't clear token, periodic checker will handle it
            android.util.Log.d("MainActivity", "Bridge not ready for navigation, relying on periodic checker");
        }
    }
    
    /**
     * Schedule a retry for direct navigation
     */
    private void scheduleNavigationRetry(String token, int nextRetry, int delayMs) {
        new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
            directNavigateWithToken(token, nextRetry);
        }, delayMs);
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
        if (this.getBridge() != null && this.getBridge().getWebView() != null) {
            android.util.Log.d("MainActivity", "[SHARE] Notifying bridge with share data: " + shareJson);
            runOnUiThread(() -> {
                try {
                    // Dispatch a CustomEvent with the share data in the detail property
                    String js = String.format(
                        "(function() { " +
                        "  var event = new CustomEvent('incomingShare', { detail: %s }); " +
                        "  window.dispatchEvent(event); " +
                        "  console.log('[MainActivity] incomingShare event dispatched with detail:', %s); " +
                        "})();",
                        shareJson, shareJson
                    );
                    this.getBridge().getWebView().evaluateJavascript(js, null);
                    android.util.Log.d("MainActivity", "[SHARE] JavaScript event dispatched successfully");
                } catch (Exception e) {
                    android.util.Log.e("MainActivity", "[SHARE] Failed to dispatch JS event: " + e.getMessage());
                }
            });
        } else {
            android.util.Log.d("MainActivity", "[SHARE] Bridge not ready, share data stored for cold start retrieval");
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
