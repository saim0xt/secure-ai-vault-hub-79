
package app.lovable.plugins;

import android.Manifest;
import android.app.Activity;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import android.telephony.TelephonyManager;
import android.view.WindowManager;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import app.lovable.services.ScreenshotPreventionService;
import app.lovable.services.VolumeKeyService;
import app.lovable.services.SecurityMonitorService;
import app.lovable.receivers.DialerCodeReceiver;
import app.lovable.receivers.SelfDestructReceiver;

@CapacitorPlugin(
    name = "NativeSecurity",
    permissions = {
        @Permission(strings = { Manifest.permission.SYSTEM_ALERT_WINDOW }, alias = "overlay"),
        @Permission(strings = { Manifest.permission.READ_PHONE_STATE }, alias = "phone"),
        @Permission(strings = { Manifest.permission.CALL_PHONE }, alias = "call"),
        @Permission(strings = { Manifest.permission.MODIFY_AUDIO_SETTINGS }, alias = "audio"),
        @Permission(strings = { Manifest.permission.BIND_DEVICE_ADMIN }, alias = "device_admin"),
        @Permission(strings = { Manifest.permission.PACKAGE_USAGE_STATS }, alias = "usage_stats")
    }
)
public class NativeSecurityPlugin extends Plugin {

    private ScreenshotPreventionService screenshotService;
    private VolumeKeyService volumeService;
    private SecurityMonitorService monitorService;
    private DialerCodeReceiver dialerReceiver;

    @Override
    public void load() {
        screenshotService = new ScreenshotPreventionService(getContext());
        volumeService = new VolumeKeyService(getContext());
        monitorService = new SecurityMonitorService(getContext());
        dialerReceiver = new DialerCodeReceiver();
    }

    @PluginMethod
    public void enableScreenshotPrevention(PluginCall call) {
        try {
            Activity activity = getActivity();
            if (activity != null) {
                activity.runOnUiThread(() -> {
                    activity.getWindow().setFlags(
                        WindowManager.LayoutParams.FLAG_SECURE,
                        WindowManager.LayoutParams.FLAG_SECURE
                    );
                });
                
                Intent serviceIntent = new Intent(getContext(), ScreenshotPreventionService.class);
                getContext().startForegroundService(serviceIntent);
                
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            } else {
                call.reject("Activity not available");
            }
        } catch (Exception e) {
            call.reject("Failed to enable screenshot prevention: " + e.getMessage());
        }
    }

    @PluginMethod
    public void disableScreenshotPrevention(PluginCall call) {
        try {
            Activity activity = getActivity();
            if (activity != null) {
                activity.runOnUiThread(() -> {
                    activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                });
                
                Intent serviceIntent = new Intent(getContext(), ScreenshotPreventionService.class);
                getContext().stopService(serviceIntent);
                
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            } else {
                call.reject("Activity not available");
            }
        } catch (Exception e) {
            call.reject("Failed to disable screenshot prevention: " + e.getMessage());
        }
    }

    @PluginMethod
    public void enableVolumeKeyCapture(PluginCall call) {
        if (!hasPermission("audio")) {
            requestPermissionForAlias("audio", call, "enableVolumeKeyCapture");
            return;
        }

        try {
            Intent serviceIntent = new Intent(getContext(), VolumeKeyService.class);
            serviceIntent.setAction("ENABLE_CAPTURE");
            getContext().startForegroundService(serviceIntent);
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to enable volume key capture: " + e.getMessage());
        }
    }

    @PluginMethod
    public void disableVolumeKeyCapture(PluginCall call) {
        try {
            Intent serviceIntent = new Intent(getContext(), VolumeKeyService.class);
            serviceIntent.setAction("DISABLE_CAPTURE");
            getContext().startService(serviceIntent);
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to disable volume key capture: " + e.getMessage());
        }
    }

    @PluginMethod
    public void changeAppIcon(PluginCall call) {
        String iconName = call.getString("iconName");
        if (iconName == null) {
            call.reject("Icon name is required");
            return;
        }

        try {
            PackageManager pm = getContext().getPackageManager();
            String packageName = getContext().getPackageName();
            
            // Disable current launcher activity
            ComponentName mainActivity = new ComponentName(packageName, packageName + ".MainActivity");
            pm.setComponentEnabledSetting(mainActivity, 
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED, 
                PackageManager.DONT_KILL_APP);
            
            // Enable target activity based on icon name
            String targetActivity = iconName.equals("calculator") ? 
                packageName + ".CalculatorActivity" : packageName + ".MainActivity";
            
            ComponentName targetComponent = new ComponentName(packageName, targetActivity);
            pm.setComponentEnabledSetting(targetComponent, 
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED, 
                PackageManager.DONT_KILL_APP);
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to change app icon: " + e.getMessage());
        }
    }

    @PluginMethod
    public void enableStealthMode(PluginCall call) {
        try {
            // Change to calculator icon
            changeAppIcon(call);
            
            // Start stealth monitoring
            Intent serviceIntent = new Intent(getContext(), SecurityMonitorService.class);
            serviceIntent.setAction("ENABLE_STEALTH");
            getContext().startForegroundService(serviceIntent);
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to enable stealth mode: " + e.getMessage());
        }
    }

    @PluginMethod
    public void disableStealthMode(PluginCall call) {
        try {
            // Change back to vault icon
            changeAppIcon(call);
            
            // Stop stealth monitoring
            Intent serviceIntent = new Intent(getContext(), SecurityMonitorService.class);
            serviceIntent.setAction("DISABLE_STEALTH");
            getContext().startService(serviceIntent);
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to disable stealth mode: " + e.getMessage());
        }
    }

    @PluginMethod
    public void startSecurityMonitoring(PluginCall call) {
        if (!hasPermission("overlay")) {
            requestPermissionForAlias("overlay", call, "startSecurityMonitoring");
            return;
        }

        try {
            Intent serviceIntent = new Intent(getContext(), SecurityMonitorService.class);
            serviceIntent.setAction("START_MONITORING");
            getContext().startForegroundService(serviceIntent);
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to start security monitoring: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopSecurityMonitoring(PluginCall call) {
        try {
            Intent serviceIntent = new Intent(getContext(), SecurityMonitorService.class);
            getContext().stopService(serviceIntent);
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to stop security monitoring: " + e.getMessage());
        }
    }

    @PluginMethod
    public void triggerSelfDestruct(PluginCall call) {
        String confirmCode = call.getString("confirmCode");
        if (!"CONFIRMED".equals(confirmCode)) {
            call.reject("Invalid confirmation code");
            return;
        }

        try {
            Intent intent = new Intent(getContext(), SelfDestructReceiver.class);
            intent.setAction("app.lovable.SELF_DESTRUCT");
            getContext().sendBroadcast(intent);
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to trigger self-destruct: " + e.getMessage());
        }
    }

    @PluginMethod
    public void executeDialerCode(PluginCall call) {
        if (!hasPermission("phone")) {
            requestPermissionForAlias("phone", call, "executeDialerCode");
            return;
        }

        String code = call.getString("code");
        if (code == null) {
            call.reject("Dialer code is required");
            return;
        }

        try {
            if ("register".equals(code)) {
                // Register dialer code receiver
                IntentFilter filter = new IntentFilter();
                filter.addAction("android.intent.action.PHONE_STATE");
                filter.addAction("android.intent.action.NEW_OUTGOING_CALL");
                getContext().registerReceiver(dialerReceiver, filter);
            }
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to execute dialer code: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity not available");
            return;
        }

        // Request all necessary permissions
        String[] permissions = {
            Manifest.permission.SYSTEM_ALERT_WINDOW,
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.CALL_PHONE,
            Manifest.permission.MODIFY_AUDIO_SETTINGS,
            Manifest.permission.PACKAGE_USAGE_STATS,
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.WRITE_EXTERNAL_STORAGE
        };

        ActivityCompat.requestPermissions(activity, permissions, 1001);
        
        // For overlay permission, need special handling
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(getContext())) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
                activity.startActivity(intent);
            }
        }

        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
}
