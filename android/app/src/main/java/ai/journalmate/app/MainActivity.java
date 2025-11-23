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
            }
        } else if (Intent.ACTION_SEND_MULTIPLE.equals(action) && type != null) {
            if (type.startsWith("image/")) {
                handleSendMultipleImages(intent);
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
        if (imageUri != null) {
            String shareJson = String.format(
                "{\"type\":\"file\",\"files\":[\"%s\"]}",
                escapeJson(imageUri.toString())
            );
            
            // Store for cold start AND notify if bridge ready
            pendingShareData = shareJson;
            notifyBridge(shareJson);
        }
    }
    
    private void handleSendMultipleImages(Intent intent) {
        java.util.ArrayList<android.net.Uri> imageUris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
        if (imageUris != null) {
            StringBuilder filesJson = new StringBuilder("[");
            for (int i = 0; i < imageUris.size(); i++) {
                if (i > 0) filesJson.append(",");
                filesJson.append("\"").append(escapeJson(imageUris.get(i).toString())).append("\"");
            }
            filesJson.append("]");
            
            String shareJson = String.format(
                "{\"type\":\"file\",\"files\":%s}",
                filesJson.toString()
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
