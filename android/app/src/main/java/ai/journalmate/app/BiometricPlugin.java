package ai.journalmate.app;

import android.content.Context;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

import java.util.concurrent.Executor;

@CapacitorPlugin(name = "NativeBiometric")
public class BiometricPlugin extends Plugin {
    private static final String TAG = "BiometricPlugin";

    /**
     * Check if biometric authentication is available
     */
    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();

        BiometricManager biometricManager = BiometricManager.from(getContext());
        int canAuthenticate = biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG |
            BiometricManager.Authenticators.BIOMETRIC_WEAK
        );

        switch (canAuthenticate) {
            case BiometricManager.BIOMETRIC_SUCCESS:
                result.put("available", true);
                result.put("biometryType", getBiometryType());
                result.put("reason", "Biometric authentication is available");
                break;
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                result.put("available", false);
                result.put("biometryType", "none");
                result.put("reason", "No biometric hardware available");
                break;
            case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                result.put("available", false);
                result.put("biometryType", "none");
                result.put("reason", "Biometric hardware is currently unavailable");
                break;
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                result.put("available", false);
                result.put("biometryType", getBiometryType());
                result.put("reason", "No biometric credentials enrolled");
                break;
            default:
                result.put("available", false);
                result.put("biometryType", "none");
                result.put("reason", "Unknown biometric status");
                break;
        }

        Log.d(TAG, "Biometric availability: " + result.toString());
        call.resolve(result);
    }

    /**
     * Authenticate using biometrics
     */
    @PluginMethod
    public void authenticate(PluginCall call) {
        String title = call.getString("title", "Authenticate");
        String subtitle = call.getString("subtitle", "");
        String description = call.getString("description", "Use your fingerprint or face to authenticate");
        String negativeButtonText = call.getString("negativeButtonText", "Cancel");
        Boolean allowDeviceCredential = call.getBoolean("allowDeviceCredential", false);

        FragmentActivity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }

        Executor executor = ContextCompat.getMainExecutor(getContext());

        BiometricPrompt.PromptInfo.Builder promptInfoBuilder = new BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setDescription(description);

        if (subtitle != null && !subtitle.isEmpty()) {
            promptInfoBuilder.setSubtitle(subtitle);
        }

        if (allowDeviceCredential) {
            promptInfoBuilder.setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_STRONG |
                BiometricManager.Authenticators.BIOMETRIC_WEAK |
                BiometricManager.Authenticators.DEVICE_CREDENTIAL
            );
        } else {
            promptInfoBuilder.setNegativeButtonText(negativeButtonText);
            promptInfoBuilder.setAllowedAuthenticators(
                BiometricManager.Authenticators.BIOMETRIC_STRONG |
                BiometricManager.Authenticators.BIOMETRIC_WEAK
            );
        }

        BiometricPrompt.PromptInfo promptInfo = promptInfoBuilder.build();

        BiometricPrompt biometricPrompt = new BiometricPrompt(activity, executor,
            new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                    super.onAuthenticationError(errorCode, errString);
                    Log.d(TAG, "Authentication error: " + errString);

                    JSObject result = new JSObject();
                    result.put("success", false);
                    result.put("error", errString.toString());
                    result.put("errorCode", errorCode);

                    // Determine if user cancelled
                    if (errorCode == BiometricPrompt.ERROR_USER_CANCELED ||
                        errorCode == BiometricPrompt.ERROR_NEGATIVE_BUTTON) {
                        result.put("cancelled", true);
                    } else {
                        result.put("cancelled", false);
                    }

                    call.resolve(result);
                }

                @Override
                public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult authResult) {
                    super.onAuthenticationSucceeded(authResult);
                    Log.d(TAG, "Authentication succeeded");

                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("cancelled", false);
                    call.resolve(result);
                }

                @Override
                public void onAuthenticationFailed() {
                    super.onAuthenticationFailed();
                    Log.d(TAG, "Authentication failed (but can retry)");
                    // Don't resolve here - user can retry
                }
            });

        // Show biometric prompt on UI thread
        activity.runOnUiThread(() -> {
            try {
                biometricPrompt.authenticate(promptInfo);
            } catch (Exception e) {
                Log.e(TAG, "Failed to show biometric prompt: " + e.getMessage());
                call.reject("Failed to show biometric prompt: " + e.getMessage());
            }
        });
    }

    /**
     * Get the type of biometry available (fingerprint, face, iris)
     */
    private String getBiometryType() {
        // Android doesn't have a direct API to distinguish fingerprint vs face
        // We return a generic type based on what's available
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            BiometricManager biometricManager = BiometricManager.from(getContext());

            // Check for strong biometric (usually fingerprint)
            if (biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)
                == BiometricManager.BIOMETRIC_SUCCESS) {
                return "fingerprint"; // Most common strong biometric
            }

            // Check for weak biometric (could be face)
            if (biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK)
                == BiometricManager.BIOMETRIC_SUCCESS) {
                return "face";
            }
        }

        return "biometric"; // Generic fallback
    }
}
