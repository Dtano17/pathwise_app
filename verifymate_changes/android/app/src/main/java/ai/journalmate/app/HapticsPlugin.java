package ai.journalmate.app;

import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

@CapacitorPlugin(name = "NativeHaptics")
public class HapticsPlugin extends Plugin {
    private static final String TAG = "HapticsPlugin";

    private Vibrator getVibrator() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vibratorManager = (VibratorManager) getContext().getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return vibratorManager.getDefaultVibrator();
        } else {
            return (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
        }
    }

    /**
     * Light impact - for subtle UI feedback (button taps, toggles)
     */
    @PluginMethod
    public void impact(PluginCall call) {
        String style = call.getString("style", "medium");

        Vibrator vibrator = getVibrator();
        if (vibrator == null || !vibrator.hasVibrator()) {
            Log.w(TAG, "Device does not have vibrator");
            call.resolve(new JSObject().put("success", false));
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                int amplitude;
                long duration;

                switch (style) {
                    case "light":
                        amplitude = 50;
                        duration = 10;
                        break;
                    case "heavy":
                        amplitude = 255;
                        duration = 30;
                        break;
                    case "medium":
                    default:
                        amplitude = 150;
                        duration = 20;
                        break;
                }

                vibrator.vibrate(VibrationEffect.createOneShot(duration, amplitude));
            } else {
                // Legacy vibration
                vibrator.vibrate(20);
            }

            Log.d(TAG, "Impact haptic: " + style);
            call.resolve(new JSObject().put("success", true));
        } catch (Exception e) {
            Log.e(TAG, "Failed to vibrate: " + e.getMessage());
            call.resolve(new JSObject().put("success", false));
        }
    }

    /**
     * Notification haptic - for alerts and notifications
     */
    @PluginMethod
    public void notification(PluginCall call) {
        String type = call.getString("type", "success");

        Vibrator vibrator = getVibrator();
        if (vibrator == null || !vibrator.hasVibrator()) {
            call.resolve(new JSObject().put("success", false));
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                long[] pattern;
                int[] amplitudes;

                switch (type) {
                    case "success":
                        // Double tap - success feeling
                        pattern = new long[]{0, 50, 50, 50};
                        amplitudes = new int[]{0, 200, 0, 200};
                        break;
                    case "warning":
                        // Triple short tap
                        pattern = new long[]{0, 30, 30, 30, 30, 30};
                        amplitudes = new int[]{0, 150, 0, 150, 0, 150};
                        break;
                    case "error":
                        // Long buzz
                        pattern = new long[]{0, 100, 50, 100};
                        amplitudes = new int[]{0, 255, 0, 255};
                        break;
                    default:
                        pattern = new long[]{0, 50};
                        amplitudes = new int[]{0, 200};
                        break;
                }

                vibrator.vibrate(VibrationEffect.createWaveform(pattern, amplitudes, -1));
            } else {
                vibrator.vibrate(100);
            }

            Log.d(TAG, "Notification haptic: " + type);
            call.resolve(new JSObject().put("success", true));
        } catch (Exception e) {
            Log.e(TAG, "Failed to vibrate: " + e.getMessage());
            call.resolve(new JSObject().put("success", false));
        }
    }

    /**
     * Selection changed - very light feedback for scrolling/selection
     */
    @PluginMethod
    public void selectionChanged(PluginCall call) {
        Vibrator vibrator = getVibrator();
        if (vibrator == null || !vibrator.hasVibrator()) {
            call.resolve(new JSObject().put("success", false));
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                vibrator.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK));
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(5, 50));
            } else {
                vibrator.vibrate(5);
            }

            call.resolve(new JSObject().put("success", true));
        } catch (Exception e) {
            Log.e(TAG, "Failed to vibrate: " + e.getMessage());
            call.resolve(new JSObject().put("success", false));
        }
    }

    /**
     * Celebration pattern - for achievements and milestones
     */
    @PluginMethod
    public void celebrate(PluginCall call) {
        Vibrator vibrator = getVibrator();
        if (vibrator == null || !vibrator.hasVibrator()) {
            call.resolve(new JSObject().put("success", false));
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Exciting celebration pattern
                long[] pattern = new long[]{0, 50, 50, 50, 50, 100, 100, 150};
                int[] amplitudes = new int[]{0, 100, 0, 150, 0, 200, 0, 255};
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, amplitudes, -1));
            } else {
                vibrator.vibrate(new long[]{0, 50, 50, 50, 50, 100, 100, 150}, -1);
            }

            Log.d(TAG, "Celebration haptic");
            call.resolve(new JSObject().put("success", true));
        } catch (Exception e) {
            Log.e(TAG, "Failed to vibrate: " + e.getMessage());
            call.resolve(new JSObject().put("success", false));
        }
    }

    /**
     * Custom vibration pattern
     */
    @PluginMethod
    public void vibrate(PluginCall call) {
        Integer duration = call.getInt("duration", 100);

        Vibrator vibrator = getVibrator();
        if (vibrator == null || !vibrator.hasVibrator()) {
            call.resolve(new JSObject().put("success", false));
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                vibrator.vibrate(duration);
            }

            Log.d(TAG, "Custom vibration: " + duration + "ms");
            call.resolve(new JSObject().put("success", true));
        } catch (Exception e) {
            Log.e(TAG, "Failed to vibrate: " + e.getMessage());
            call.resolve(new JSObject().put("success", false));
        }
    }
}
