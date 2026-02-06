#import <Capacitor/Capacitor.h>

CAP_PLUGIN(NativeSpeech, "NativeSpeech",
    CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(checkPermission, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(requestPermission, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(startListening, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(stopListening, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(cancel, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getSupportedLanguages, CAPPluginReturnPromise);
)
