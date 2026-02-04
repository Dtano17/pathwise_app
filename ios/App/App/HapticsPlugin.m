#import <Capacitor/Capacitor.h>

CAP_PLUGIN(HapticsPlugin, "NativeHaptics",
    CAP_PLUGIN_METHOD(impact, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(notification, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(selection, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(vibrate, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(setPreferences, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getPreferences, CAPPluginReturnPromise);
)
