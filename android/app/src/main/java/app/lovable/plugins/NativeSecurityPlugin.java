
package app.lovable.plugins;

import android.Manifest;
import android.app.Activity;
import android.app.AppOpsManager;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;
import android.view.WindowManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import app.lovable.receivers.DeviceAdminReceiver;
import app.lovable.services.SecurityMonitorService;
import app.lovable.services.ScreenshotPreventionService;

@CapacitorPlugin(
    name = "NativeSecurity",
    permissions = {
        @Permission(strings = {Manifest.permission.SYSTEM_ALERT_WINDOW}),
        @Permission(strings = {Manifest.permission.PACKAGE_USAGE_STATS}),
        @Permission(strings = {Manifest.permission.BIND_DEVICE_ADMIN})
    }
)
public class NativeSecurityPlugin extends Plugin {
    
    private DevicePolicyManager devicePolicyManager;
    private ComponentName deviceAdminComponent;
    private SharedPreferences securityPrefs;
    
    @Override
    public void load() {
        devicePolicyManager = (DevicePolicyManager) getContext().getSystemService(Context.DEVICE_POLICY_SERVICE);
        deviceAdminComponent = new ComponentName(getContext(), DeviceAdminReceiver.class);
        securityPrefs = getContext().getSharedPreferences("vaultix_security", Context.MODE_PRIVATE);
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
                
                // Start screenshot prevention service
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
                
                // Stop screenshot prevention service
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
        try {
            securityPrefs.edit().putBoolean("volume_capture_enabled", true).apply();
            
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
            securityPrefs.edit().putBoolean("volume_capture_enabled", false).apply();
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to disable volume key capture: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void enableStealthMode(PluginCall call) {
        try {
            // Enable stealth mode by switching app components
            PackageManager pm = getContext().getPackageManager();
            
            // Disable main launcher
            pm.setComponentEnabledSetting(
                new ComponentName(getContext(), "app.lovable.MainActivity"),
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP
            );
            
            // Enable calculator launcher
            pm.setComponentEnabledSetting(
                new ComponentName(getContext(), "app.lovable.CalculatorActivity"),
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP
            );
            
            securityPrefs.edit().putBoolean("stealth_mode", true).apply();
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("stealth", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to enable stealth mode: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void disableStealthMode(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            
            // Enable main launcher
            pm.setComponentEnabledSetting(
                new ComponentName(getContext(), "app.lovable.MainActivity"),
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP
            );
            
            // Disable calculator launcher
            pm.setComponentEnabledSetting(
                new ComponentName(getContext(), "app.lovable.CalculatorActivity"),
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP
            );
            
            securityPrefs.edit().putBoolean("stealth_mode", false).apply();
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("stealth", false);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to disable stealth mode: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void changeAppIcon(PluginCall call) {
        String iconName = call.getString("iconName");
        try {
            if ("calculator".equals(iconName)) {
                enableStealthMode(call);
            } else {
                disableStealthMode(call);
            }
        } catch (Exception e) {
            call.reject("Failed to change app icon: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void startSecurityMonitoring(PluginCall call) {
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
        
        if (!"DESTROY_VAULT_DATA".equals(confirmCode)) {
            call.reject("Invalid confirmation code");
            return;
        }
        
        try {
            if (devicePolicyManager.isAdminActive(deviceAdminComponent)) {
                // Wipe device data if device admin is active
                devicePolicyManager.wipeData(DevicePolicyManager.WIPE_EXTERNAL_STORAGE);
            } else {
                // Just clear app data
                Intent intent = new Intent("app.lovable.SELF_DESTRUCT");
                getContext().sendBroadcast(intent);
            }
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to trigger self-destruct: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void executeDialerCode(PluginCall call) {
        String code = call.getString("code");
        try {
            if (code.contains("1337")) {
                // Grant temporary access
                securityPrefs.edit().putLong("secret_access_time", System.currentTimeMillis()).apply();
            }
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to execute dialer code: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void startAutoBackup(PluginCall call) {
        try {
            // Start auto backup service
            Intent serviceIntent = new Intent(getContext(), "app.lovable.AutoBackupService");
            getContext().startForegroundService(serviceIntent);
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to start auto backup: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void getSecurityStatus(PluginCall call) {
        try {
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("stealthMode", securityPrefs.getBoolean("stealth_mode", false));
            result.put("overlayPermission", hasOverlayPermission());
            result.put("deviceAdmin", devicePolicyManager.isAdminActive(deviceAdminComponent));
            result.put("usageStatsPermission", hasUsageStatsPermission());
            
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get security status: " + e.getMessage());
        }
    }
    
    private boolean hasOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(getContext());
        }
        return true;
    }
    
    private boolean hasUsageStatsPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            AppOpsManager appOps = (AppOpsManager) getContext().getSystemService(Context.APP_OPS_SERVICE);
            int mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(), getContext().getPackageName());
            return mode == AppOpsManager.MODE_ALLOWED;
        }
        return true;
    }
}
