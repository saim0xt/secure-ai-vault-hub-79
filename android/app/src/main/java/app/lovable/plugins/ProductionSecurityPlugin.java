
package app.lovable.plugins;

import android.Manifest;
import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CaptureRequest;
import android.media.ImageReader;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.Surface;
import android.view.WindowManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.Arrays;

import app.lovable.services.IntruderDetectionService;
import app.lovable.services.TamperDetectionService;

@CapacitorPlugin(
    name = "ProductionSecurity",
    permissions = {
        @Permission(strings = {Manifest.permission.CAMERA}),
        @Permission(strings = {Manifest.permission.WRITE_EXTERNAL_STORAGE}),
        @Permission(strings = {Manifest.permission.SYSTEM_ALERT_WINDOW})
    }
)
public class ProductionSecurityPlugin extends Plugin {
    
    private boolean screenshotPreventionEnabled = false;
    private boolean appHidden = false;
    private boolean realTimeMonitoring = false;
    private boolean secureMode = false;
    private IntruderDetectionService intruderService;
    private TamperDetectionService tamperService;
    
    @Override
    public void load() {
        intruderService = new IntruderDetectionService(getContext());
        tamperService = new TamperDetectionService(getContext());
    }
    
    @PluginMethod
    public void enableRealScreenshotPrevention(PluginCall call) {
        Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> {
                try {
                    activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                    
                    // Also prevent screen recording on newer Android versions
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                    }
                    
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
    public void disableRealScreenshotPrevention(PluginCall call) {
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
    public void enableAppHiding(PluginCall call) {
        boolean calculatorMode = call.getBoolean("calculatorMode", true);
        
        try {
            PackageManager packageManager = getContext().getPackageManager();
            
            if (calculatorMode) {
                // Disable main launcher
                ComponentName mainActivity = new ComponentName(getContext(), 
                    "app.lovable.MainActivity");
                packageManager.setComponentEnabledSetting(mainActivity,
                    PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                    PackageManager.DONT_KILL_APP);
                
                // Enable calculator launcher alias
                ComponentName calculatorActivity = new ComponentName(getContext(), 
                    "app.lovable.CalculatorActivity");
                packageManager.setComponentEnabledSetting(calculatorActivity,
                    PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                    PackageManager.DONT_KILL_APP);
            }
            
            appHidden = true;
            
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
    public void disableAppHiding(PluginCall call) {
        try {
            PackageManager packageManager = getContext().getPackageManager();
            
            // Enable main launcher
            ComponentName mainActivity = new ComponentName(getContext(), 
                "app.lovable.MainActivity");
            packageManager.setComponentEnabledSetting(mainActivity,
                PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                PackageManager.DONT_KILL_APP);
            
            // Disable calculator launcher alias
            ComponentName calculatorActivity = new ComponentName(getContext(), 
                "app.lovable.CalculatorActivity");
            packageManager.setComponentEnabledSetting(calculatorActivity,
                PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP);
            
            appHidden = false;
            
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
    public void startRealTimeMonitoring(PluginCall call) {
        try {
            intruderService.startMonitoring();
            tamperService.startMonitoring();
            realTimeMonitoring = true;
            
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
    public void stopRealTimeMonitoring(PluginCall call) {
        try {
            intruderService.stopMonitoring();
            tamperService.stopMonitoring();
            realTimeMonitoring = false;
            
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
    public void captureIntruderPhoto(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.CAMERA) 
                != PackageManager.PERMISSION_GRANTED) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", "Camera permission not granted");
            call.resolve(result);
            return;
        }
        
        try {
            String photoPath = intruderService.captureIntruderPhoto();
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("photoPath", photoPath);
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }
    
    @PluginMethod
    public void detectTamperAttempts(PluginCall call) {
        try {
            boolean tampering = tamperService.detectTampering();
            JSObject details = tamperService.getTamperDetails();
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("tampering", tampering);
            result.put("details", details);
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }
    
    @PluginMethod
    public void enableSecureMode(PluginCall call) {
        try {
            // Enable all security features
            Activity activity = getActivity();
            if (activity != null) {
                activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
            }
            
            intruderService.startMonitoring();
            tamperService.startMonitoring();
            
            secureMode = true;
            screenshotPreventionEnabled = true;
            realTimeMonitoring = true;
            
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
    public void disableSecureMode(PluginCall call) {
        try {
            Activity activity = getActivity();
            if (activity != null) {
                activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            }
            
            secureMode = false;
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
    }
    
    @PluginMethod
    public void wipeSecureData(PluginCall call) {
        try {
            // Clear all app data
            File dataDir = new File(getContext().getApplicationInfo().dataDir);
            deleteRecursive(dataDir);
            
            // Clear external storage
            File externalDir = getContext().getExternalFilesDir(null);
            if (externalDir != null) {
                deleteRecursive(externalDir);
            }
            
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
    
    private void deleteRecursive(File fileOrDirectory) {
        if (fileOrDirectory.isDirectory()) {
            for (File child : fileOrDirectory.listFiles()) {
                deleteRecursive(child);
            }
        }
        fileOrDirectory.delete();
    }
}
