
package app.lovable.plugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import app.lovable.services.RealNativeNotificationService;

@CapacitorPlugin(name = "RealNativeNotification")
public class RealNativeNotificationPlugin extends Plugin {
    
    private RealNativeNotificationService notificationService;
    
    @Override
    public void load() {
        notificationService = new RealNativeNotificationService(getContext());
    }
    
    @PluginMethod
    public void showSecurityAlert(PluginCall call) {
        String title = call.getString("title", "Security Alert");
        String message = call.getString("message", "Security issue detected");
        String alertType = call.getString("alertType", "security");
        
        notificationService.showSecurityAlert(title, message, alertType);
        
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
    
    @PluginMethod
    public void showPermissionRequest(PluginCall call) {
        String permission = call.getString("permission", "unknown");
        String reason = call.getString("reason", "Required for app functionality");
        
        notificationService.showPermissionRequest(permission, reason);
        
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
    
    @PluginMethod
    public void clearAllNotifications(PluginCall call) {
        notificationService.clearAllNotifications();
        
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
    
    @PluginMethod
    public void areNotificationsEnabled(PluginCall call) {
        boolean enabled = notificationService.areNotificationsEnabled();
        
        JSObject result = new JSObject();
        result.put("enabled", enabled);
        call.resolve(result);
    }
}
