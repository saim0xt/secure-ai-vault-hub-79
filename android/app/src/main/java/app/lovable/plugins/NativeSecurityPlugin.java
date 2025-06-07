
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
import android.util.Log;

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
import app.lovable.services.AutoBackupService;
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
        @Permission(strings = { Manifest.permission.PACKAGE_USAGE_STATS }, alias = "usage_stats"),
        @Permission(strings = { Manifest.permission.CAMERA }, alias = "camera"),
        @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION }, alias = "location"),
        @Permission(strings = { Manifest.permission.WRITE_EXTERNAL_STORAGE }, alias = "storage")
    }
)
public class NativeSecurityPlugin extends Plugin {
    private static final String TAG = "NativeSecurityPlugin";
    private DialerCodeReceiver dialerReceiver;
    private boolean isStealthModeActive = false;

    @Override
    public void load() {
        Log.d(TAG, "NativeSecurityPlugin loaded");
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
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    getContext().startForegroundService(serviceIntent);
                } else {
                    getContext().startService(serviceIntent);
                }
                
                Log.d(TAG, "Screenshot prevention enabled");
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            } else {
                call.reject("Activity not available");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to enable screenshot prevention", e);
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
                
                Log.d(TAG, "Screenshot prevention disabled");
                JSObject result = new JSObject();
                result.put("success", true);
                call.resolve(result);
            } else {
                call.reject("Activity not available");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to disable screenshot prevention", e);
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
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }
            
            Log.d(TAG, "Volume key capture enabled");
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to enable volume key capture", e);
            call.reject("Failed to enable volume key capture: " + e.getMessage());
        }
    }

    @PluginMethod
    public void disableVolumeKeyCapture(PluginCall call) {
        try {
            Intent serviceIntent = new Intent(getContext(), VolumeKeyService.class);
            serviceIntent.setAction("DISABLE_CAPTURE");
            getContext().startService(serviceIntent);
            
            Log.d(TAG, "Volume key capture disabled");
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to disable volume key capture", e);
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
            
            if ("calculator".equals(iconName)) {
                // Enable calculator activity, disable main
                enableComponent(pm, packageName + ".CalculatorActivity");
                disableComponent(pm, packageName + ".MainActivity");
                isStealthModeActive = true;
            } else {
                // Enable main activity, disable calculator
                enableComponent(pm, packageName + ".MainActivity");
                disableComponent(pm, packageName + ".CalculatorActivity");
                isStealthModeActive = false;
            }
            
            Log.d(TAG, "App icon changed to: " + iconName);
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("stealth", isStealthModeActive);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to change app icon", e);
            call.reject("Failed to change app icon: " + e.getMessage());
        }
    }

    @PluginMethod
    public void enableStealthMode(PluginCall call) {
        try {
            // Change to calculator icon
            PackageManager pm = getContext().getPackageManager();
            String packageName = getContext().getPackageName();
            enableComponent(pm, packageName + ".CalculatorActivity");
            disableComponent(pm, packageName + ".MainActivity");
            
            // Start stealth monitoring
            Intent serviceIntent = new Intent(getContext(), SecurityMonitorService.class);
            serviceIntent.setAction("ENABLE_STEALTH");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }
            
            isStealthModeActive = true;
            Log.d(TAG, "Stealth mode enabled");
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to enable stealth mode", e);
            call.reject("Failed to enable stealth mode: " + e.getMessage());
        }
    }

    @PluginMethod
    public void disableStealthMode(PluginCall call) {
        try {
            // Change back to vault icon
            PackageManager pm = getContext().getPackageManager();
            String packageName = getContext().getPackageName();
            enableComponent(pm, packageName + ".MainActivity");
            disableComponent(pm, packageName + ".CalculatorActivity");
            
            // Stop stealth monitoring
            Intent serviceIntent = new Intent(getContext(), SecurityMonitorService.class);
            serviceIntent.setAction("DISABLE_STEALTH");
            getContext().startService(serviceIntent);
            
            isStealthModeActive = false;
            Log.d(TAG, "Stealth mode disabled");
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to disable stealth mode", e);
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
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }
            
            Log.d(TAG, "Security monitoring started");
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start security monitoring", e);
            call.reject("Failed to start security monitoring: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopSecurityMonitoring(PluginCall call) {
        try {
            Intent serviceIntent = new Intent(getContext(), SecurityMonitorService.class);
            serviceIntent.setAction("STOP_MONITORING");
            getContext().startService(serviceIntent);
            
            Log.d(TAG, "Security monitoring stopped");
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop security monitoring", e);
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
            // Check if device admin is enabled
            DevicePolicyManager dpm = (DevicePolicyManager) getContext().getSystemService(Context.DEVICE_POLICY_SERVICE);
            ComponentName adminComponent = new ComponentName(getContext(), SelfDestructReceiver.class);
            
            if (dpm != null && dpm.isAdminActive(adminComponent)) {
                Intent intent = new Intent(getContext(), SelfDestructReceiver.class);
                intent.setAction("app.lovable.SELF_DESTRUCT");
                getContext().sendBroadcast(intent);
                
                Log.w(TAG, "Self-destruct triggered with device admin");
            } else {
                // Fallback: clear app data only
                Intent intent = new Intent("vaultix.self.destruct.fallback");
                getContext().sendBroadcast(intent);
                
                Log.w(TAG, "Self-destruct triggered without device admin");
            }
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to trigger self-destruct", e);
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
                filter.setPriority(1000);
                getContext().registerReceiver(dialerReceiver, filter);
                Log.d(TAG, "Dialer code receiver registered");
            }
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to execute dialer code", e);
            call.reject("Failed to execute dialer code: " + e.getMessage());
        }
    }

    @PluginMethod
    public void startAutoBackup(PluginCall call) {
        try {
            Intent serviceIntent = new Intent(getContext(), AutoBackupService.class);
            serviceIntent.setAction("START_BACKUP");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }
            
            Log.d(TAG, "Auto backup started");
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start auto backup", e);
            call.reject("Failed to start auto backup: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getSecurityStatus(PluginCall call) {
        try {
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("stealthMode", isStealthModeActive);
            result.put("overlayPermission", canDrawOverlays());
            result.put("deviceAdmin", isDeviceAdminEnabled());
            result.put("usageStatsPermission", hasUsageStatsPermission());
            
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get security status: " + e.getMessage());
        }
    }

    private void enableComponent(PackageManager pm, String componentName) {
        ComponentName component = new ComponentName(getContext(), componentName);
        pm.setComponentEnabledSetting(component, 
            PackageManager.COMPONENT_ENABLED_STATE_ENABLED, 
            PackageManager.DONT_KILL_APP);
    }

    private void disableComponent(PackageManager pm, String componentName) {
        ComponentName component = new ComponentName(getContext(), componentName);
        pm.setComponentEnabledSetting(component, 
            PackageManager.COMPONENT_ENABLED_STATE_DISABLED, 
            PackageManager.DONT_KILL_APP);
    }

    private boolean canDrawOverlays() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(getContext());
        }
        return true;
    }

    private boolean isDeviceAdminEnabled() {
        DevicePolicyManager dpm = (DevicePolicyManager) getContext().getSystemService(Context.DEVICE_POLICY_SERVICE);
        ComponentName adminComponent = new ComponentName(getContext(), SelfDestructReceiver.class);
        return dpm != null && dpm.isAdminActive(adminComponent);
    }

    private boolean hasUsageStatsPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            return ContextCompat.checkSelfPermission(getContext(), 
                Manifest.permission.PACKAGE_USAGE_STATS) == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }
}
