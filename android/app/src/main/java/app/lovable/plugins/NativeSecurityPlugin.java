
package app.lovable.plugins;

import android.Manifest;
import android.app.Activity;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
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

import app.lovable.receivers.SelfDestructReceiver;
import app.lovable.services.SecurityMonitorService;
import app.lovable.services.VolumeKeyService;

@CapacitorPlugin(
    name = "NativeSecurity",
    permissions = {
        @Permission(strings = {Manifest.permission.CAMERA}),
        @Permission(strings = {Manifest.permission.RECORD_AUDIO}),
        @Permission(strings = {Manifest.permission.ACCESS_FINE_LOCATION}),
        @Permission(strings = {Manifest.permission.READ_EXTERNAL_STORAGE}),
        @Permission(strings = {Manifest.permission.WRITE_EXTERNAL_STORAGE}),
        @Permission(strings = {Manifest.permission.SYSTEM_ALERT_WINDOW}),
        @Permission(strings = {Manifest.permission.PACKAGE_USAGE_STATS}),
        @Permission(strings = {Manifest.permission.BIND_DEVICE_ADMIN})
    }
)
public class NativeSecurityPlugin extends Plugin {
    
    private DevicePolicyManager devicePolicyManager;
    private ComponentName deviceAdminReceiver;
    private boolean screenshotPreventionEnabled = false;
    private boolean volumeKeyCaptureEnabled = false;
    private boolean stealthModeEnabled = false;

    @Override
    public void load() {
        devicePolicyManager = (DevicePolicyManager) getContext().getSystemService(Context.DEVICE_POLICY_SERVICE);
        deviceAdminReceiver = new ComponentName(getContext(), SelfDestructReceiver.class);
    }

    @PluginMethod
    public void enableScreenshotPrevention(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> {
                try {
                    activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                    screenshotPreventionEnabled = true;
                    
                    JSObject result = new JSObject();
                    result.put("success", true);
                    call.resolve(result);
                } catch (Exception e) {
                    JSObject result = new JSObject();
                    result.put("success", false);
                    result.put("error", e.getMessage());
                    call.resolve(result);
                }
            });
        } else {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", "Activity not available");
            call.resolve(result);
        }
    }

    @PluginMethod
    public void disableScreenshotPrevention(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> {
                try {
                    activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                    screenshotPreventionEnabled = false;
                    
                    JSObject result = new JSObject();
                    result.put("success", true);
                    call.resolve(result);
                } catch (Exception e) {
                    JSObject result = new JSObject();
                    result.put("success", false);
                    result.put("error", e.getMessage());
                    call.resolve(result);
                }
            });
        } else {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", "Activity not available");
            call.resolve(result);
        }
    }

    @PluginMethod
    public void enableVolumeKeyCapture(PluginCall call) {
        try {
            Intent serviceIntent = new Intent(getContext(), VolumeKeyService.class);
            getContext().startForegroundService(serviceIntent);
            volumeKeyCaptureEnabled = true;
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void disableVolumeKeyCapture(PluginCall call) {
        try {
            Intent serviceIntent = new Intent(getContext(), VolumeKeyService.class);
            getContext().stopService(serviceIntent);
            volumeKeyCaptureEnabled = false;
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void requestDeviceAdmin(PluginCall call) {
        try {
            Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
            intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, deviceAdminReceiver);
            intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, 
                "Enable device administrator to use security features like self-destruct");
            startActivityForResult(call, intent, "deviceAdminResult");
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (!Settings.canDrawOverlays(getContext())) {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getContext().getPackageName()));
                    startActivityForResult(call, intent, "overlayPermissionResult");
                } else {
                    JSObject result = new JSObject();
                    result.put("success", true);
                    call.resolve(result);
                }
            } else {
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            }
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void enableStealthMode(PluginCall call) {
        try {
            PackageManager packageManager = getContext().getPackageManager();
            
            // Disable main launcher
            ComponentName mainActivity = new ComponentName(getContext(), 
                "app.lovable.MainActivity");
            packageManager.setComponentEnabledSetting(mainActivity,
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP);
            
            // Enable calculator launcher
            ComponentName calculatorActivity = new ComponentName(getContext(), 
                "app.lovable.CalculatorActivity");
            packageManager.setComponentEnabledSetting(calculatorActivity,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP);
            
            stealthModeEnabled = true;
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void disableStealthMode(PluginCall call) {
        try {
            PackageManager packageManager = getContext().getPackageManager();
            
            // Enable main launcher
            ComponentName mainActivity = new ComponentName(getContext(), 
                "app.lovable.MainActivity");
            packageManager.setComponentEnabledSetting(mainActivity,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP);
            
            // Disable calculator launcher
            ComponentName calculatorActivity = new ComponentName(getContext(), 
                "app.lovable.CalculatorActivity");
            packageManager.setComponentEnabledSetting(calculatorActivity,
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP);
            
            stealthModeEnabled = false;
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void startSecurityMonitoring(PluginCall call) {
        try {
            Intent serviceIntent = new Intent(getContext(), SecurityMonitorService.class);
            getContext().startForegroundService(serviceIntent);
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
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
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void triggerSelfDestruct(PluginCall call) {
        String confirmCode = call.getString("confirmCode");
        
        try {
            if (devicePolicyManager.isAdminActive(deviceAdminReceiver)) {
                // Wipe device data
                devicePolicyManager.wipeData(DevicePolicyManager.WIPE_EXTERNAL_STORAGE);
                
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            } else {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", "Device admin not enabled");
                call.resolve(result);
            }
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void getSecurityStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("stealthMode", stealthModeEnabled);
        result.put("overlayPermission", Settings.canDrawOverlays(getContext()));
        result.put("deviceAdmin", devicePolicyManager.isAdminActive(deviceAdminReceiver));
        result.put("usageStatsPermission", hasUsageStatsPermission());
        result.put("volumeKeyCaptureEnabled", volumeKeyCaptureEnabled);
        result.put("screenshotPrevention", screenshotPreventionEnabled);
        call.resolve(result);
    }

    private boolean hasUsageStatsPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            try {
                PackageManager packageManager = getContext().getPackageManager();
                return packageManager.checkPermission(Manifest.permission.PACKAGE_USAGE_STATS, 
                    getContext().getPackageName()) == PackageManager.PERMISSION_GRANTED;
            } catch (Exception e) {
                return false;
            }
        }
        return false;
    }
}
