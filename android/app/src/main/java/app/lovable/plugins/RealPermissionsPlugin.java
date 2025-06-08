
package app.lovable.plugins;

import android.Manifest;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "RealPermissions",
    permissions = {
        @Permission(strings = {Manifest.permission.CAMERA}),
        @Permission(strings = {Manifest.permission.RECORD_AUDIO}),
        @Permission(strings = {Manifest.permission.ACCESS_FINE_LOCATION}),
        @Permission(strings = {Manifest.permission.ACCESS_COARSE_LOCATION}),
        @Permission(strings = {Manifest.permission.WRITE_EXTERNAL_STORAGE}),
        @Permission(strings = {Manifest.permission.READ_EXTERNAL_STORAGE}),
        @Permission(strings = {Manifest.permission.READ_PHONE_STATE}),
        @Permission(strings = {Manifest.permission.CALL_PHONE})
    }
)
public class RealPermissionsPlugin extends Plugin {

    private static final int OVERLAY_PERMISSION_REQ_CODE = 1001;
    private static final int DEVICE_ADMIN_REQ_CODE = 1002;
    private static final int USAGE_STATS_REQ_CODE = 1003;

    @PluginMethod
    public void checkAllPermissions(PluginCall call) {
        JSObject result = new JSObject();
        
        result.put("camera", hasPermission(Manifest.permission.CAMERA));
        result.put("microphone", hasPermission(Manifest.permission.RECORD_AUDIO));
        result.put("location", hasLocationPermission());
        result.put("storage", hasStoragePermission());
        result.put("phone", hasPhonePermission());
        result.put("overlay", hasOverlayPermission());
        result.put("deviceAdmin", hasDeviceAdminPermission());
        result.put("usageStats", hasUsageStatsPermission());
        
        call.resolve(result);
    }

    @PluginMethod
    public void requestAllPermissions(PluginCall call) {
        String[] permissions = {
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION,
            Manifest.permission.WRITE_EXTERNAL_STORAGE,
            Manifest.permission.READ_EXTERNAL_STORAGE,
            Manifest.permission.READ_PHONE_STATE,
            Manifest.permission.CALL_PHONE
        };
        
        requestPermissionForAliases(permissions, call, "allPermissionsCallback");
    }

    @PluginMethod
    public void requestSpecificPermission(PluginCall call) {
        String permission = call.getString("permission");
        
        switch (permission) {
            case "camera":
                requestPermissionForAlias(Manifest.permission.CAMERA, call, "specificPermissionCallback");
                break;
            case "microphone":
                requestPermissionForAlias(Manifest.permission.RECORD_AUDIO, call, "specificPermissionCallback");
                break;
            case "location":
                requestLocationPermission(call);
                break;
            case "storage":
                requestStoragePermission(call);
                break;
            case "phone":
                requestPhonePermission(call);
                break;
            case "overlay":
                requestOverlayPermission(call);
                break;
            case "deviceAdmin":
                requestDeviceAdminPermission(call);
                break;
            case "usageStats":
                requestUsageStatsPermission(call);
                break;
            default:
                call.reject("Unknown permission: " + permission);
        }
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
        intent.setData(uri);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    private boolean hasPermission(String permission) {
        return ContextCompat.checkSelfPermission(getContext(), permission) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean hasLocationPermission() {
        return hasPermission(Manifest.permission.ACCESS_FINE_LOCATION) || 
               hasPermission(Manifest.permission.ACCESS_COARSE_LOCATION);
    }

    private boolean hasStoragePermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return hasPermission(Manifest.permission.READ_MEDIA_IMAGES) &&
                   hasPermission(Manifest.permission.READ_MEDIA_VIDEO) &&
                   hasPermission(Manifest.permission.READ_MEDIA_AUDIO);
        } else {
            return hasPermission(Manifest.permission.READ_EXTERNAL_STORAGE) &&
                   hasPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE);
        }
    }

    private boolean hasPhonePermission() {
        return hasPermission(Manifest.permission.READ_PHONE_STATE);
    }

    private boolean hasOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(getContext());
        }
        return true;
    }

    private boolean hasDeviceAdminPermission() {
        DevicePolicyManager dpm = (DevicePolicyManager) getContext().getSystemService(Context.DEVICE_POLICY_SERVICE);
        ComponentName adminComponent = new ComponentName(getContext(), VaultixDeviceAdminReceiver.class);
        return dpm.isAdminActive(adminComponent);
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
        return true;
    }

    private void requestLocationPermission(PluginCall call) {
        String[] permissions = {
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        };
        requestPermissionForAliases(permissions, call, "specificPermissionCallback");
    }

    private void requestStoragePermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            String[] permissions = {
                Manifest.permission.READ_MEDIA_IMAGES,
                Manifest.permission.READ_MEDIA_VIDEO,
                Manifest.permission.READ_MEDIA_AUDIO
            };
            requestPermissionForAliases(permissions, call, "specificPermissionCallback");
        } else {
            String[] permissions = {
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            };
            requestPermissionForAliases(permissions, call, "specificPermissionCallback");
        }
    }

    private void requestPhonePermission(PluginCall call) {
        requestPermissionForAlias(Manifest.permission.READ_PHONE_STATE, call, "specificPermissionCallback");
    }

    private void requestOverlayPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivityForResult(intent, OVERLAY_PERMISSION_REQ_CODE);
            
            // Store call for callback
            bridge.saveCall(call);
        } else {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
        }
    }

    private void requestDeviceAdminPermission(PluginCall call) {
        ComponentName adminComponent = new ComponentName(getContext(), VaultixDeviceAdminReceiver.class);
        Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
        intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent);
        intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, 
                       "Enable device administrator to protect your vault with advanced security features");
        
        getActivity().startActivityForResult(intent, DEVICE_ADMIN_REQ_CODE);
        bridge.saveCall(call);
    }

    private void requestUsageStatsPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivityForResult(intent, USAGE_STATS_REQ_CODE);
            bridge.saveCall(call);
        } else {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
        }
    }

    @PermissionCallback
    private void allPermissionsCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", true);
        call.resolve(result);
    }

    @PermissionCallback
    private void specificPermissionCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", true);
        call.resolve(result);
    }
}
