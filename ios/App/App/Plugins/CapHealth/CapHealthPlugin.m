#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(CapHealthPlugin, "CapHealth",
    CAP_PLUGIN_METHOD(isAvailable,          CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(requestAuthorization, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(read,                 CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(write,                CAPPluginReturnPromise);
)
