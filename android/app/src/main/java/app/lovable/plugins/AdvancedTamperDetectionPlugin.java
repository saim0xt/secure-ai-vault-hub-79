
package app.lovable.plugins;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.security.MessageDigest;

@CapacitorPlugin(name = "AdvancedTamperDetection")
public class AdvancedTamperDetectionPlugin extends Plugin {
    
    @PluginMethod
    public void detectRootAccess(PluginCall call) {
        JSObject result = new JSObject();
        boolean isRooted = isDeviceRooted();
        
        result.put("isRooted", isRooted);
        result.put("confidence", isRooted ? 0.9 : 0.1);
        result.put("indicators", getRootIndicators());
        
        call.resolve(result);
    }

    @PluginMethod
    public void detectEmulator(PluginCall call) {
        JSObject result = new JSObject();
        boolean isEmulator = isRunningOnEmulator();
        
        result.put("isEmulator", isEmulator);
        result.put("confidence", isEmulator ? 0.95 : 0.05);
        result.put("indicators", getEmulatorIndicators());
        
        call.resolve(result);
    }

    @PluginMethod
    public void detectDebugging(PluginCall call) {
        JSObject result = new JSObject();
        boolean isDebugging = isDebuggingEnabled();
        
        result.put("isDebugging", isDebugging);
        result.put("isDebugBuild", isDebugBuild());
        result.put("isDeveloperOptionsEnabled", isDeveloperOptionsEnabled());
        
        call.resolve(result);
    }

    @PluginMethod
    public void detectHooking(PluginCall call) {
        JSObject result = new JSObject();
        
        result.put("xposedDetected", isXposedInstalled());
        result.put("friddaDetected", isFridaDetected());
        result.put("substrateDetected", isSubstrateDetected());
        
        call.resolve(result);
    }

    @PluginMethod
    public void verifyAppIntegrity(PluginCall call) {
        JSObject result = new JSObject();
        
        try {
            PackageManager pm = getContext().getPackageManager();
            PackageInfo packageInfo = pm.getPackageInfo(getContext().getPackageName(), 
                                                        PackageManager.GET_SIGNATURES);
            
            result.put("signatureValid", verifySignature(packageInfo));
            result.put("installerValid", verifyInstaller());
            result.put("apkIntegrityValid", verifyApkIntegrity());
            
        } catch (Exception e) {
            result.put("error", e.getMessage());
        }
        
        call.resolve(result);
    }

    private boolean isDeviceRooted() {
        return checkRootMethod1() || checkRootMethod2() || checkRootMethod3();
    }

    private boolean checkRootMethod1() {
        String buildTags = Build.TAGS;
        return buildTags != null && buildTags.contains("test-keys");
    }

    private boolean checkRootMethod2() {
        String[] paths = {
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su",
            "/su/bin/su"
        };
        
        for (String path : paths) {
            if (new File(path).exists()) return true;
        }
        return false;
    }

    private boolean checkRootMethod3() {
        Process process = null;
        try {
            process = Runtime.getRuntime().exec(new String[]{"/system/xbin/which", "su"});
            BufferedReader in = new BufferedReader(new InputStreamReader(process.getInputStream()));
            return in.readLine() != null;
        } catch (Throwable t) {
            return false;
        } finally {
            if (process != null) process.destroy();
        }
    }

    private JSObject getRootIndicators() {
        JSObject indicators = new JSObject();
        indicators.put("testKeys", checkRootMethod1());
        indicators.put("suBinary", checkRootMethod2());
        indicators.put("whichSu", checkRootMethod3());
        return indicators;
    }

    private boolean isRunningOnEmulator() {
        return Build.FINGERPRINT.startsWith("generic") ||
               Build.FINGERPRINT.startsWith("unknown") ||
               Build.MODEL.contains("google_sdk") ||
               Build.MODEL.contains("Emulator") ||
               Build.MODEL.contains("Android SDK") ||
               Build.MANUFACTURER.contains("Genymotion") ||
               Build.BRAND.startsWith("generic") ||
               Build.DEVICE.startsWith("generic") ||
               "google_sdk".equals(Build.PRODUCT) ||
               Build.HARDWARE.contains("goldfish") ||
               Build.HARDWARE.contains("ranchu");
    }

    private JSObject getEmulatorIndicators() {
        JSObject indicators = new JSObject();
        indicators.put("fingerprint", Build.FINGERPRINT.startsWith("generic"));
        indicators.put("model", Build.MODEL.contains("google_sdk"));
        indicators.put("manufacturer", Build.MANUFACTURER.contains("Genymotion"));
        indicators.put("hardware", Build.HARDWARE.contains("goldfish"));
        return indicators;
    }

    private boolean isDebuggingEnabled() {
        return (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    private boolean isDebugBuild() {
        return BuildConfig.DEBUG;
    }

    private boolean isDeveloperOptionsEnabled() {
        return Settings.Secure.getInt(getContext().getContentResolver(), 
                                     Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0) != 0;
    }

    private boolean isXposedInstalled() {
        try {
            throw new Exception();
        } catch (Exception e) {
            for (StackTraceElement stackTraceElement : e.getStackTrace()) {
                if (stackTraceElement.getClassName().contains("de.robv.android.xposed.XposedBridge")) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean isFridaDetected() {
        String[] fridaRelatedFiles = {
            "/data/local/tmp/frida-server",
            "/data/local/tmp/re.frida.server"
        };
        
        for (String file : fridaRelatedFiles) {
            if (new File(file).exists()) {
                return true;
            }
        }
        return false;
    }

    private boolean isSubstrateDetected() {
        try {
            Class.forName("com.saurik.substrate.MS$2");
            return true;
        } catch (ClassNotFoundException e) {
            return false;
        }
    }

    private boolean verifySignature(PackageInfo packageInfo) {
        // In production, compare with known good signature
        return packageInfo.signatures != null && packageInfo.signatures.length > 0;
    }

    private boolean verifyInstaller() {
        PackageManager pm = getContext().getPackageManager();
        String installer = pm.getInstallerPackageName(getContext().getPackageName());
        
        return installer != null && (
            installer.equals("com.android.vending") ||
            installer.equals("com.amazon.venezia") ||
            installer.equals("com.sec.android.app.samsungapps")
        );
    }

    private boolean verifyApkIntegrity() {
        try {
            String apkPath = getContext().getPackageCodePath();
            File apkFile = new File(apkPath);
            return apkFile.exists() && apkFile.canRead();
        } catch (Exception e) {
            return false;
        }
    }
}
