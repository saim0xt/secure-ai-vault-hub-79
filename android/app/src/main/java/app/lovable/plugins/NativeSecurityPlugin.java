
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
import android.media.AudioManager;
import android.view.KeyEvent;
import android.app.KeyguardManager;
import android.os.PowerManager;

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
import app.lovable.receivers.VolumeButtonReceiver;

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
    private VolumeButtonReceiver volumeReceiver;
    private boolean isStealthModeActive = false;
    private boolean isVolumeKeyCaptureEnabled = false;
    private AudioManager audioManager;
    private DevicePolicyManager devicePolicyManager;
    private ComponentName adminComponent;

    @Override
    public void load() {
        Log.d(TAG, "NativeSecurityPlugin loaded");
        dialerReceiver = new DialerCodeReceiver();
        volumeReceiver = new VolumeButtonReceiver();
        audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        devicePolicyManager = (DevicePolicyManager) getContext().getSystemService(Context.DEVICE_POLICY_SERVICE);
        adminComponent = new ComponentName(getContext(), SelfDestructReceiver.class);
    }

    @PluginMethod
    public void enableScreenshotPrevention(PluginCall call) {
        try {
            Activity activity = getActivity();
            if (activity != null) {
                activity.runOnUiThread(() -> {
                    // Set FLAG_SECURE to prevent screenshots and screen recording
                    activity.getWindow().setFlags(
                        WindowManager.LayoutParams.FLAG_SECURE,
                        WindowManager.LayoutParams.FLAG_SECURE
                    );
                    Log.d(TAG, "FLAG_SECURE enabled for screenshot prevention");
                });
                
                // Start foreground service for additional protection
                Intent serviceIntent = new Intent(getContext(), ScreenshotPreventionService.class);
                serviceIntent.setAction("ENABLE_PREVENTION");
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    getContext().startForegroundService(serviceIntent);
                } else {
                    getContext().startService(serviceIntent);
                }
                
                // Also prevent content from appearing in recent apps
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    activity.runOnUiThread(() -> {
                        activity.setTaskDescription(new android.app.ActivityManager.TaskDescription(
                            "Calculator", null, android.graphics.Color.BLACK));
                    });
                }
                
                Log.d(TAG, "Screenshot prevention enabled successfully");
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
                    Log.d(TAG, "FLAG_SECURE disabled");
                });
                
                Intent serviceIntent = new Intent(getContext(), ScreenshotPreventionService.class);
                serviceIntent.setAction("DISABLE_PREVENTION");
                getContext().stopService(serviceIntent);
                
                Log.d(TAG, "Screenshot prevention disabled successfully");
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
            // Register volume button receiver with high priority
            IntentFilter filter = new IntentFilter();
            filter.addAction("android.media.VOLUME_CHANGED_ACTION");
            filter.setPriority(IntentFilter.SYSTEM_HIGH_PRIORITY);
            
            getContext().registerReceiver(volumeReceiver, filter);
            
            // Start volume key service
            Intent serviceIntent = new Intent(getContext(), VolumeKeyService.class);
            serviceIntent.setAction("ENABLE_CAPTURE");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }
            
            isVolumeKeyCaptureEnabled = true;
            
            Log.d(TAG, "Volume key capture enabled successfully");
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
            if (volumeReceiver != null) {
                try {
                    getContext().unregisterReceiver(volumeReceiver);
                } catch (IllegalArgumentException e) {
                    Log.w(TAG, "Volume receiver was not registered");
                }
            }
            
            Intent serviceIntent = new Intent(getContext(), VolumeKeyService.class);
            serviceIntent.setAction("DISABLE_CAPTURE");
            getContext().stopService(serviceIntent);
            
            isVolumeKeyCaptureEnabled = false;
            
            Log.d(TAG, "Volume key capture disabled successfully");
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
                Log.d(TAG, "Switched to calculator icon (stealth mode)");
            } else {
                // Enable main activity, disable calculator
                enableComponent(pm, packageName + ".MainActivity");
                disableComponent(pm, packageName + ".CalculatorActivity");
                isStealthModeActive = false;
                Log.d(TAG, "Switched to vault icon (normal mode)");
            }
            
            // Clear app from recent tasks to hide the change
            Activity activity = getActivity();
            if (activity != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                activity.finishAndRemoveTask();
            }
            
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
        if (!canDrawOverlays()) {
            call.reject("Overlay permission required for stealth mode");
            return;
        }

        try {
            // Change to calculator icon
            PackageManager pm = getContext().getPackageManager();
            String packageName = getContext().getPackageName();
            enableComponent(pm, packageName + ".CalculatorActivity");
            disableComponent(pm, packageName + ".MainActivity");
            
            // Start stealth monitoring service
            Intent serviceIntent = new Intent(getContext(), SecurityMonitorService.class);
            serviceIntent.setAction("ENABLE_STEALTH");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }
            
            // Enable additional security measures
            enableScreenshotPrevention(call);
            
            isStealthModeActive = true;
            Log.d(TAG, "Stealth mode enabled successfully");
            
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
            getContext().stopService(serviceIntent);
            
            isStealthModeActive = false;
            Log.d(TAG, "Stealth mode disabled successfully");
            
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
        if (!canDrawOverlays()) {
            // Request overlay permission
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                android.net.Uri.parse("package:" + getContext().getPackageName()));
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.reject("Overlay permission required. Please grant permission and try again.");
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
            
            Log.d(TAG, "Security monitoring started successfully");
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
            getContext().stopService(serviceIntent);
            
            Log.d(TAG, "Security monitoring stopped successfully");
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
            if (devicePolicyManager != null && devicePolicyManager.isAdminActive(adminComponent)) {
                // Device admin is active - can perform factory reset
                Log.w(TAG, "Triggering device wipe with admin privileges");
                devicePolicyManager.wipeData(DevicePolicyManager.WIPE_EXTERNAL_STORAGE);
            } else {
                // Fallback: clear app data and trigger emergency broadcast
                Log.w(TAG, "Triggering app data wipe (no admin privileges)");
                Intent intent = new Intent("app.lovable.SELF_DESTRUCT");
                intent.putExtra("confirmed", true);
                getContext().sendBroadcast(intent);
                
                // Clear app data
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                    ((android.app.ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE))
                        .clearApplicationUserData();
                }
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
                filter.addAction(TelephonyManager.ACTION_PHONE_STATE_CHANGED);
                filter.addAction("android.intent.action.NEW_OUTGOING_CALL");
                filter.setPriority(IntentFilter.SYSTEM_HIGH_PRIORITY);
                getContext().registerReceiver(dialerReceiver, filter);
                Log.d(TAG, "Dialer code receiver registered successfully");
            } else if ("*#1337#*".equals(code)) {
                // Secret access code detected
                Log.d(TAG, "Secret access code executed");
                
                // Broadcast secret access event
                Intent intent = new Intent("vaultix.secret.access");
                intent.putExtra("code", code);
                intent.putExtra("timestamp", System.currentTimeMillis());
                getContext().sendBroadcast(intent);
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
            
            Log.d(TAG, "Auto backup started successfully");
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
            result.put("volumeKeyCaptureEnabled", isVolumeKeyCaptureEnabled);
            result.put("screenshotPrevention", isScreenshotPreventionActive());
            
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to get security status: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestDeviceAdmin(PluginCall call) {
        try {
            Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
            intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent);
            intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION,
                "Vaultix requires device admin privileges for advanced security features including self-destruct capability.");
            
            getActivity().startActivityForResult(intent, 100);
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to request device admin", e);
            call.reject("Failed to request device admin: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    android.net.Uri.parse("package:" + getContext().getPackageName()));
                intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Failed to request overlay permission", e);
            call.reject("Failed to request overlay permission: " + e.getMessage());
        }
    }

    // Helper methods
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
        return devicePolicyManager != null && devicePolicyManager.isAdminActive(adminComponent);
    }

    private boolean hasUsageStatsPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            return ContextCompat.checkSelfPermission(getContext(), 
                Manifest.permission.PACKAGE_USAGE_STATS) == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    private boolean isScreenshotPreventionActive() {
        Activity activity = getActivity();
        if (activity != null) {
            int flags = activity.getWindow().getAttributes().flags;
            return (flags & WindowManager.LayoutParams.FLAG_SECURE) != 0;
        }
        return false;
    }
}
