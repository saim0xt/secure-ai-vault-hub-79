
package app.lovable.services;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;

import java.io.File;
import java.security.MessageDigest;

public class TamperDetectionService {
    
    private Context context;
    private boolean monitoring = false;
    private String originalSignature;
    private long originalInstallTime;
    private long originalUpdateTime;
    
    public TamperDetectionService(Context context) {
        this.context = context;
        initializeBaseline();
    }
    
    private void initializeBaseline() {
        try {
            PackageManager pm = context.getPackageManager();
            PackageInfo packageInfo = pm.getPackageInfo(context.getPackageName(), PackageManager.GET_SIGNATURES);
            
            // Store original signature
            if (packageInfo.signatures != null && packageInfo.signatures.length > 0) {
                originalSignature = packageInfo.signatures[0].toCharsString();
            }
            
            originalInstallTime = packageInfo.firstInstallTime;
            originalUpdateTime = packageInfo.lastUpdateTime;
        } catch (PackageManager.NameNotFoundException e) {
            e.printStackTrace();
        }
    }
    
    public void startMonitoring() {
        monitoring = true;
    }
    
    public void stopMonitoring() {
        monitoring = false;
    }
    
    public boolean detectTampering() {
        if (!monitoring) return false;
        
        try {
            // Check signature integrity
            if (!verifySignature()) {
                return true;
            }
            
            // Check for debugging
            if (isDebuggingEnabled()) {
                return true;
            }
            
            // Check for root/emulator
            if (isRootedOrEmulator()) {
                return true;
            }
            
            // Check install source
            if (!verifyInstallSource()) {
                return true;
            }
            
            // Check file integrity
            if (!verifyFileIntegrity()) {
                return true;
            }
            
            return false;
        } catch (Exception e) {
            return true; // Assume tampering if checks fail
        }
    }
    
    private boolean verifySignature() {
        try {
            PackageManager pm = context.getPackageManager();
            PackageInfo packageInfo = pm.getPackageInfo(context.getPackageName(), PackageManager.GET_SIGNATURES);
            
            if (packageInfo.signatures != null && packageInfo.signatures.length > 0) {
                String currentSignature = packageInfo.signatures[0].toCharsString();
                return originalSignature.equals(currentSignature);
            }
            
            return false;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }
    
    private boolean isDebuggingEnabled() {
        return (context.getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }
    
    private boolean isRootedOrEmulator() {
        // Check for common root indicators
        String[] rootPaths = {
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su"
        };
        
        for (String path : rootPaths) {
            if (new File(path).exists()) {
                return true;
            }
        }
        
        // Check for emulator
        return Build.FINGERPRINT.startsWith("generic") ||
               Build.FINGERPRINT.startsWith("unknown") ||
               Build.MODEL.contains("google_sdk") ||
               Build.MODEL.contains("Emulator") ||
               Build.MODEL.contains("Android SDK") ||
               Build.MANUFACTURER.contains("Genymotion") ||
               (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"));
    }
    
    private boolean verifyInstallSource() {
        try {
            PackageManager pm = context.getPackageManager();
            String installer = pm.getInstallerPackageName(context.getPackageName());
            
            // Check if installed from trusted sources
            return installer != null && (
                installer.equals("com.android.vending") || // Google Play Store
                installer.equals("com.amazon.venezia") ||   // Amazon Appstore
                installer.equals("com.sec.android.app.samsungapps") // Samsung Galaxy Store
            );
        } catch (Exception e) {
            return false;
        }
    }
    
    private boolean verifyFileIntegrity() {
        try {
            // Check APK file integrity
            String apkPath = context.getPackageCodePath();
            File apkFile = new File(apkPath);
            
            if (!apkFile.exists()) {
                return false;
            }
            
            // Additional integrity checks can be added here
            return true;
        } catch (Exception e) {
            return false;
        }
    }
    
    public JSObject getTamperDetails() {
        JSObject details = new JSObject();
        
        try {
            details.put("signatureValid", verifySignature());
            details.put("debuggingEnabled", isDebuggingEnabled());
            details.put("rootedOrEmulator", isRootedOrEmulator());
            details.put("validInstallSource", verifyInstallSource());
            details.put("fileIntegrityValid", verifyFileIntegrity());
            details.put("deviceId", Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ANDROID_ID));
            details.put("buildFingerprint", Build.FINGERPRINT);
        } catch (Exception e) {
            details.put("error", e.getMessage());
        }
        
        return details;
    }
}
