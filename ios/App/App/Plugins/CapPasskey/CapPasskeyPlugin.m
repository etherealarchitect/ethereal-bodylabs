#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Registers CapPasskeyPlugin with Capacitor so JS can access it via
// registerPlugin<CapPasskeyPlugin>("CapPasskey").
CAP_PLUGIN(CapPasskeyPlugin, "CapPasskey",
    CAP_PLUGIN_METHOD(isSupported, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(register,   CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(assert,     CAPPluginReturnPromise);
)
