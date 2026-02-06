#import <Capacitor/Capacitor.h>

CAP_PLUGIN(NativeNotifications, "NativeNotifications",
    CAP_PLUGIN_METHOD(checkPermission, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(requestPermission, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(show, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(schedule, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(cancel, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(cancelAll, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getPending, CAPPluginReturnPromise);
)
