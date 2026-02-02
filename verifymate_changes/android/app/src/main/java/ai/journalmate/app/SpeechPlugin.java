package ai.journalmate.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

import java.util.ArrayList;
import java.util.Locale;

@CapacitorPlugin(
    name = "NativeSpeech",
    permissions = {
        @Permission(
            strings = { Manifest.permission.RECORD_AUDIO },
            alias = "microphone"
        )
    }
)
public class SpeechPlugin extends Plugin {
    private static final String TAG = "SpeechPlugin";
    private SpeechRecognizer speechRecognizer;
    private boolean isListening = false;
    private PluginCall activeCall;

    @Override
    public void load() {
        super.load();
        Log.d(TAG, "SpeechPlugin loaded");
    }

    /**
     * Check if speech recognition is available
     */
    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        boolean available = SpeechRecognizer.isRecognitionAvailable(getContext());
        result.put("available", available);
        result.put("platform", "android");

        if (!available) {
            result.put("reason", "Speech recognition not available on this device");
        }

        Log.d(TAG, "Speech recognition available: " + available);
        call.resolve(result);
    }

    /**
     * Check microphone permission
     */
    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject result = new JSObject();
        boolean granted = ContextCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED;

        result.put("granted", granted);
        result.put("platform", "android");
        call.resolve(result);
    }

    /**
     * Request microphone permission
     */
    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (ContextCompat.checkSelfPermission(
                getContext(),
                Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            result.put("platform", "android");
            call.resolve(result);
            return;
        }

        requestPermissionForAlias("microphone", call, "permissionCallback");
    }

    @PluginMethod
    public void permissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        boolean granted = ContextCompat.checkSelfPermission(
            getContext(),
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED;

        result.put("granted", granted);
        result.put("platform", "android");
        call.resolve(result);
    }

    /**
     * Start listening for speech
     */
    @PluginMethod
    public void startListening(PluginCall call) {
        // Check permission
        if (ContextCompat.checkSelfPermission(
                getContext(),
                Manifest.permission.RECORD_AUDIO
            ) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Microphone permission not granted");
            return;
        }

        // Check if already listening
        if (isListening) {
            call.reject("Already listening");
            return;
        }

        String language = call.getString("language", "en-US");
        Boolean partialResults = call.getBoolean("partialResults", true);
        Integer maxResults = call.getInt("maxResults", 5);

        activeCall = call;

        getActivity().runOnUiThread(() -> {
            try {
                // Create speech recognizer
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
                speechRecognizer.setRecognitionListener(new RecognitionListener() {
                    @Override
                    public void onReadyForSpeech(Bundle params) {
                        Log.d(TAG, "Ready for speech");
                        isListening = true;

                        // Notify JS that we're listening
                        JSObject event = new JSObject();
                        event.put("status", "listening");
                        notifyListeners("speechStatus", event);
                    }

                    @Override
                    public void onBeginningOfSpeech() {
                        Log.d(TAG, "Speech started");
                    }

                    @Override
                    public void onRmsChanged(float rmsdB) {
                        // Audio level changed - could use for visualization
                    }

                    @Override
                    public void onBufferReceived(byte[] buffer) {
                        // Not used
                    }

                    @Override
                    public void onEndOfSpeech() {
                        Log.d(TAG, "Speech ended");
                        isListening = false;

                        JSObject event = new JSObject();
                        event.put("status", "processing");
                        notifyListeners("speechStatus", event);
                    }

                    @Override
                    public void onError(int error) {
                        Log.e(TAG, "Speech recognition error: " + error);
                        isListening = false;

                        String errorMessage = getErrorMessage(error);

                        if (activeCall != null) {
                            JSObject result = new JSObject();
                            result.put("success", false);
                            result.put("error", errorMessage);
                            result.put("errorCode", error);
                            activeCall.resolve(result);
                            activeCall = null;
                        }

                        cleanup();
                    }

                    @Override
                    public void onResults(Bundle results) {
                        Log.d(TAG, "Got speech results");
                        isListening = false;

                        ArrayList<String> matches = results.getStringArrayList(
                            SpeechRecognizer.RESULTS_RECOGNITION
                        );

                        if (activeCall != null) {
                            JSObject result = new JSObject();
                            result.put("success", true);

                            if (matches != null && !matches.isEmpty()) {
                                result.put("text", matches.get(0)); // Best result
                                JSArray allMatches = new JSArray();
                                for (String match : matches) {
                                    allMatches.put(match);
                                }
                                result.put("alternatives", allMatches);
                            } else {
                                result.put("text", "");
                                result.put("alternatives", new JSArray());
                            }

                            activeCall.resolve(result);
                            activeCall = null;
                        }

                        cleanup();
                    }

                    @Override
                    public void onPartialResults(Bundle partialResultsBundle) {
                        ArrayList<String> matches = partialResultsBundle.getStringArrayList(
                            SpeechRecognizer.RESULTS_RECOGNITION
                        );

                        if (matches != null && !matches.isEmpty()) {
                            JSObject event = new JSObject();
                            event.put("partial", true);
                            event.put("text", matches.get(0));
                            notifyListeners("speechPartialResult", event);
                        }
                    }

                    @Override
                    public void onEvent(int eventType, Bundle params) {
                        // Not used
                    }
                });

                // Create intent
                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                    RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, partialResults);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, maxResults);

                // Start listening
                speechRecognizer.startListening(intent);
                Log.d(TAG, "Started listening with language: " + language);

            } catch (Exception e) {
                Log.e(TAG, "Failed to start speech recognition: " + e.getMessage());
                if (activeCall != null) {
                    activeCall.reject("Failed to start speech recognition: " + e.getMessage());
                    activeCall = null;
                }
            }
        });
    }

    /**
     * Stop listening
     */
    @PluginMethod
    public void stopListening(PluginCall call) {
        if (!isListening || speechRecognizer == null) {
            call.resolve(new JSObject().put("success", true));
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                speechRecognizer.stopListening();
                isListening = false;
                Log.d(TAG, "Stopped listening");
                call.resolve(new JSObject().put("success", true));
            } catch (Exception e) {
                Log.e(TAG, "Failed to stop listening: " + e.getMessage());
                call.reject("Failed to stop: " + e.getMessage());
            }
        });
    }

    /**
     * Cancel speech recognition
     */
    @PluginMethod
    public void cancel(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            cleanup();
            isListening = false;
            if (activeCall != null) {
                activeCall.resolve(new JSObject().put("success", false).put("cancelled", true));
                activeCall = null;
            }
            call.resolve(new JSObject().put("success", true));
        });
    }

    /**
     * Get supported languages
     */
    @PluginMethod
    public void getSupportedLanguages(PluginCall call) {
        JSObject result = new JSObject();
        JSArray languages = new JSArray();

        // Common supported languages
        String[] commonLanguages = {
            "en-US", "en-GB", "es-ES", "es-MX", "fr-FR", "de-DE",
            "it-IT", "pt-BR", "pt-PT", "ja-JP", "ko-KR", "zh-CN",
            "zh-TW", "ru-RU", "ar-SA", "hi-IN", "nl-NL", "pl-PL"
        };

        for (String lang : commonLanguages) {
            languages.put(lang);
        }

        result.put("languages", languages);
        result.put("defaultLanguage", Locale.getDefault().toLanguageTag());
        call.resolve(result);
    }

    /**
     * Cleanup resources
     */
    private void cleanup() {
        if (speechRecognizer != null) {
            try {
                speechRecognizer.destroy();
            } catch (Exception e) {
                Log.e(TAG, "Error destroying speech recognizer: " + e.getMessage());
            }
            speechRecognizer = null;
        }
    }

    /**
     * Get human-readable error message
     */
    private String getErrorMessage(int errorCode) {
        switch (errorCode) {
            case SpeechRecognizer.ERROR_AUDIO:
                return "Audio recording error";
            case SpeechRecognizer.ERROR_CLIENT:
                return "Client side error";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "Insufficient permissions";
            case SpeechRecognizer.ERROR_NETWORK:
                return "Network error";
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                return "Network timeout";
            case SpeechRecognizer.ERROR_NO_MATCH:
                return "No speech detected";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                return "Recognition service busy";
            case SpeechRecognizer.ERROR_SERVER:
                return "Server error";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "No speech input";
            default:
                return "Unknown error";
        }
    }

    @Override
    protected void handleOnDestroy() {
        cleanup();
        super.handleOnDestroy();
    }
}
