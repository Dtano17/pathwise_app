#import <Capacitor/Capacitor.h>

CAP_PLUGIN(SharePlugin, "SharePlugin",
    CAP_PLUGIN_METHOD(getPendingShare, CAPPluginReturnPromise);
)
