#import <Capacitor/Capacitor.h>

CAP_PLUGIN(NativeContacts, "NativeContacts",
    CAP_PLUGIN_METHOD(checkPermission, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(requestPermission, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getContacts, CAPPluginReturnPromise);
)
