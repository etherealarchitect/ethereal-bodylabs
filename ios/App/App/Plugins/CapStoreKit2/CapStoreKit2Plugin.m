#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(CapStoreKit2Plugin, "CapStoreKit2",
    CAP_PLUGIN_METHOD(products,                 CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(purchase,                 CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(restore,                  CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(currentEntitlements,      CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(showManageSubscriptions,  CAPPluginReturnPromise);
)
