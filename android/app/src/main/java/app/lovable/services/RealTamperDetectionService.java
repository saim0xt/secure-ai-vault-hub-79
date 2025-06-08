
package app.lovable.services;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSObject;

import java.io.File;
import java.security.MessageDigest;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class RealTamperDetectionService {
    
    private static final String TAG = "TamperDetection";
    private Context context;
    private boolean monitoring = false;
    private String originalSignature;
    private long originalInstallTime;
    private long originalUpdateTime;
    private ScheduledExecutorService executor;
    private TamperDetectionListener listener;
    
    public interface TamperDetectionListener {
        void onTamperDetected(String reason, JSObject details);
    }
    
    public RealTamperDetectionService(Context context) {
        this.context = context;
        initializeBaseline();
    }
    
    public void setTamperDetectionListener(TamperDetectionListener listener) {
        this.listener = listener;
    }
    
    private void initializeBaseline() {
        try {
            PackageManager pm = context.getPackageManager();
            PackageInfo packageInfo = pm.getPackageInfo(context.getPackageName(), PackageManager.GET_SIGNATURES);
            
            // Store original signature
            if (packageInfo.signatures != null && packageInfo.signatures.length > 0) {
                originalSignature = calculateSignatureHash(packageInfo.signatures[0]);
            }
            
            originalInstallTime = packageInfo.firstInstallTime;
            originalUpdateTime = packageInfo.lastUpdateTime;
            
            Log.d(TAG, "Tamper detection baseline initialized");
        } catch (PackageManager.NameNotFoundException e) {
            Log.e(TAG, "Failed to initialize baseline", e);
        }
    }
    
    private String calculateSignatureHash(Signature signature) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(signature.toByteArray());
            byte[] digest = md.digest();
            
            StringBuilder result = new StringBuilder();
            for (byte b : digest) {
                result.append(String.format("%02x", b));
            }
            return result.toString();
        } catch (Exception e) {
            Log.e(TAG, "Failed to calculate signature hash", e);
            return "";
        }
    }
    
    public void startMonitoring() {
        if (!monitoring) {
            monitoring = true;
            executor = Executors.newSingleThreadScheduledExecutor();
            
            // Check for tampering every 10 seconds
            executor.scheduleWithFixedDelay(this::performTamperCheck, 0, 10, TimeUnit.SECONDS);
            
            Log.d(TAG, "Tamper detection monitoring started");
        }
    }
    
    public void stopMonitoring() {
        if (monitoring) {
            monitoring = false;
            if (executor != null) {
                executor.shutdown();
                executor = null;
            }
            Log.d(TAG, "Tamper detection monitoring stopped");
        }
    }
    
    private void performTamperCheck() {
        try {
            JSObject tamperDetails = getTamperDetails();
            
            // Check signature integrity
            if (!verifySignature()) {
                notifyTamperDetected("Signature verification failed", tamperDetails);
                return;
            }
            
            // Check for debugging
            if (isDebuggingEnabled()) {
                notifyTamperDetected("Debugging detected", tamperDetails);
                return;
            }
            
            // Check for root/emulator
            if (isRootedOrEmulator()) {
                notifyTamperDetected("Rooted device or emulator detected", tamperDetails);
                return;
            }
            
            // Check install source
            if (!verifyInstallSource()) {
                notifyTamperDetected("Invalid install source", tamperDetails);
                return;
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error during tamper check", e);
            JSObject details = new JSObject();
            details.put("error", e.getMessage());
            notifyTamperDetected("Tamper check failed", details);
        }
    }
    
    private void notifyTamperDetected(String reason, JSObject details) {
        Log.w(TAG, "Tamper detected: " + reason);
        if (listener != null) {
            listener.onTamperDetected(reason, details);
        }
    }
    
    public boolean detectTampering() {
        if (!monitoring) return false;
        
        try {
            return !verifySignature() || 
                   isDebuggingEnabled() || 
                   isRootedOrEmulator() || 
                   !verifyInstallSource() || 
                   !verifyFileIntegrity();
        } catch (Exception e) {
            Log.e(TAG, "Error detecting tampering", e);
            return true; // Assume tampering if checks fail
        }
    }
    
    private boolean verifySignature() {
        try {
            PackageManager pm = context.getPackageManager();
            PackageInfo packageInfo = pm.getPackageInfo(context.getPackageName(), PackageManager.GET_SIGNATURES);
            
            if (packageInfo.signatures != null && packageInfo.signatures.length > 0) {
                String currentSignature = calculateSignatureHash(packageInfo.signatures[0]);
                return originalSignature.equals(currentSignature);
            }
            
            return false;
        } catch (PackageManager.NameNotFoundException e) {
            Log.e(TAG, "Failed to verify signature", e);
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
            "/data/local/su",
            "/system/etc/init.d/99SuperSUDaemon",
            "/dev/com.koushikdutta.superuser.daemon/"
        };
        
        for (String path : rootPaths) {
            if (new File(path).exists()) {
                return true;
            }
        }
        
        // Check for emulator indicators
        return Build.FINGERPRINT.startsWith("generic") ||
               Build.FINGERPRINT.startsWith("unknown") ||
               Build.MODEL.contains("google_sdk") ||
               Build.MODEL.contains("Emulator") ||
               Build.MODEL.contains("Android SDK") ||
               Build.MANUFACTURER.contains("Genymotion") ||
               Build.HARDWARE.contains("goldfish") ||
               Build.HARDWARE.contains("ranchu") ||
               (Build.BRAND.startsWith("generic") && Build.DEVICE.startsWith("generic"));
    }
    
    private boolean verifyInstallSource() {
        try {
            PackageManager pm = context.getPackageManager();
            String installer = pm.getInstallerPackageName(context.getPackageName());
            
            // Allow trusted sources
            if (installer == null) {
                // Allow sideloading in debug mode
                return isDebuggingEnabled();
            }
            
            return installer.equals("com.android.vending") || // Google Play Store
                   installer.equals("com.amazon.venezia") ||   // Amazon Appstore
                   installer.equals("com.sec.android.app.samsungapps") || // Samsung Galaxy Store
                   installer.equals("com.huawei.appmarket") || // Huawei AppGallery
                   installer.equals("com.xiaomi.mipicks"); // Xiaomi GetApps
        } catch (Exception e) {
            Log.e(TAG, "Failed to verify install source", e);
            return false;
        }
    }
    
    private boolean verifyFileIntegrity() {
        try {
            // Check APK file integrity
            String apkPath = context.getPackageCodePath();
            File apkFile = new File(apkPath);
            
            if (!apkFile.exists() || !apkFile.canRead()) {
                return false;
            }
            
            // Additional integrity checks
            return apkFile.length() > 0;
        } catch (Exception e) {
            Log.e(TAG, "Failed to verify file integrity", e);
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
            details.put("buildTags", Build.TAGS);
            details.put("manufacturer", Build.MANUFACTURER);
            details.put("model", Build.MODEL);
            details.put("brand", Build.BRAND);
            details.put("hardware", Build.HARDWARE);
            details.put("monitoring", monitoring);
        } catch (Exception e) {
            details.put("error", e.getMessage());
        }
        
        return details;
    }
    
    public boolean isMonitoring() {
        return monitoring;
    }
}
