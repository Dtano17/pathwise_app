#import <Capacitor/Capacitor.h>

CAP_PLUGIN(NativeBiometric, "NativeBiometric",
    CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(authenticate, CAPPluginReturnPromise);
)
