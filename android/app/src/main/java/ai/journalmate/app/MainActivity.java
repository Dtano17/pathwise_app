package ai.journalmate.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;

public class MainActivity extends BridgeActivity {
    
    // Store incoming intent for cold start
    private static String pendingShareData = null;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Register our Share plugin
        registerPlugin(SharePlugin.class);
        
        // Handle intent
        handleIncomingIntent(getIntent());
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
