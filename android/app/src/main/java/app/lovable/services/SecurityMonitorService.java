
package app.lovable.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import app.lovable.R;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.List;

public class SecurityMonitorService extends Service {
    private static final String CHANNEL_ID = "security_monitor_channel";
    private static final int NOTIFICATION_ID = 1003;
    private static final String TAG = "SecurityMonitorService";
    
    private WindowManager windowManager;
    private View overlayView;
    private Handler handler;
    private Runnable monitoringRunnable;
    private boolean isMonitoring = false;
    private boolean stealthMode = false;
    private boolean rootDetected = false;
    private boolean debuggerDetected = false;
    private boolean emulatorDetected = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        handler = new Handler();
        
        // Perform initial security checks
        performSecurityChecks();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        
        if ("START_MONITORING".equals(action)) {
            startMonitoring();
        } else if ("ENABLE_STEALTH".equals(action)) {
            enableStealthMode();
        } else if ("DISABLE_STEALTH".equals(action)) {
            disableStealthMode();
        } else if ("STOP_MONITORING".equals(action)) {
            stopMonitoring();
        }
        
        if (isMonitoring) {
            startForeground(NOTIFICATION_ID, createNotification());
        }
        
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        stopMonitoring();
    }

    private void performSecurityChecks() {
        // Check for root
        rootDetected = checkForRoot();
        if (rootDetected) {
            sendSecurityAlert("Root access detected", "critical");
        }
        
        // Check for debugger
        debuggerDetected = checkForDebugger();
        if (debuggerDetected) {
            sendSecurityAlert("Debugger detected", "high");
        }
        
        // Check for emulator
        emulatorDetected = checkForEmulator();
        if (emulatorDetected) {
            sendSecurityAlert("Emulator detected", "medium");
        }
        
        Log.d(TAG, "Security checks completed. Root: " + rootDetected + 
              ", Debugger: " + debuggerDetected + ", Emulator: " + emulatorDetected);
    }

    private boolean checkForRoot() {
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
            "/su/bin/su"
        };
        
        for (String path : rootPaths) {
            if (new java.io.File(path).exists()) {
                return true;
            }
        }
        
        // Try to execute su command
        try {
            Process process = Runtime.getRuntime().exec("su");
            return true;
        } catch (Exception e) {
            // su command not found or access denied
        }
        
        return false;
    }

    private boolean checkForDebugger() {
        // Check if debugger is attached
        return android.os.Debug.isDebuggerConnected() || android.os.Debug.waitingForDebugger();
    }

    private boolean checkForEmulator() {
        // Check various emulator indicators
        String buildModel = Build.MODEL;
        String buildManufacturer = Build.MANUFACTURER;
        String buildBrand = Build.BRAND;
        String buildDevice = Build.DEVICE;
        String buildProduct = Build.PRODUCT;
        
        if (buildModel.contains("google_sdk") ||
            buildModel.contains("Emulator") ||
            buildModel.contains("Android SDK") ||
            buildManufacturer.contains("Genymotion") ||
            buildBrand.startsWith("generic") ||
            buildDevice.startsWith("generic") ||
            buildProduct.contains("sdk") ||
            buildProduct.contains("emulator")) {
            return true;
        }
        
        // Check for typical emulator properties
        String androidId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
        if ("9774d56d682e549c".equals(androidId)) {
            return true; // Default emulator Android ID
        }
        
        return false;
    }

    private void startMonitoring() {
        if (!isMonitoring && canDrawOverlays()) {
            createSecurityOverlay();
            startUsageMonitoring();
            isMonitoring = true;
            Log.d(TAG, "Security monitoring started");
        }
    }

    private void stopMonitoring() {
        if (isMonitoring) {
            removeSecurityOverlay();
            stopUsageMonitoring();
            isMonitoring = false;
            Log.d(TAG, "Security monitoring stopped");
        }
    }

    private void enableStealthMode() {
        stealthMode = true;
        startMonitoring();
        Log.d(TAG, "Stealth mode enabled");
    }

    private void disableStealthMode() {
        stealthMode = false;
        Log.d(TAG, "Stealth mode disabled");
    }

    private boolean canDrawOverlays() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(this);
        }
        return true;
    }

    private void createSecurityOverlay() {
        if (overlayView != null) return;

        LayoutInflater inflater = LayoutInflater.from(this);
        overlayView = inflater.inflate(R.layout.security_overlay, null);

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            1, 1,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ?
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY :
                WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
            WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE |
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.TOP | Gravity.LEFT;
        params.x = 0;
        params.y = 0;

        try {
            windowManager.addView(overlayView, params);
            Log.d(TAG, "Security overlay created");
        } catch (Exception e) {
            Log.e(TAG, "Failed to create overlay", e);
        }
    }

    private void removeSecurityOverlay() {
        if (overlayView != null) {
            try {
                windowManager.removeView(overlayView);
                Log.d(TAG, "Security overlay removed");
            } catch (Exception e) {
                Log.e(TAG, "Failed to remove overlay", e);
            }
            overlayView = null;
        }
    }

    private void startUsageMonitoring() {
        monitoringRunnable = new Runnable() {
            @Override
            public void run() {
                if (isMonitoring) {
                    checkAppUsage();
                    detectSuspiciousActivity();
                    checkSecurityThreats();
                    handler.postDelayed(this, 5000); // Check every 5 seconds
                }
            }
        };
        handler.post(monitoringRunnable);
    }

    private void stopUsageMonitoring() {
        if (monitoringRunnable != null) {
            handler.removeCallbacks(monitoringRunnable);
            monitoringRunnable = null;
        }
    }

    private void checkAppUsage() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            UsageStatsManager usageStatsManager = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
            long endTime = System.currentTimeMillis();
            long startTime = endTime - 10000; // Last 10 seconds

            List<UsageStats> stats = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_BEST, startTime, endTime);

            for (UsageStats usageStat : stats) {
                if (usageStat.getLastTimeUsed() > startTime) {
                    checkSuspiciousApp(usageStat.getPackageName());
                }
            }
        }
    }

    private void checkSuspiciousApp(String packageName) {
        String[] suspiciousApps = {
            "com.android.shell",
            "com.android.packageinstaller", 
            "com.topjohnwu.magisk",
            "eu.chainfire.supersu",
            "com.noshufou.android.su",
            "com.koushikdutta.superuser",
            "com.zachspong.temprootremovejb",
            "com.ramdroid.appquarantine",
            "com.android.vending.billing.InAppBillingService.COIN",
            "com.chelpus.lackypatch",
            "com.android.vending.billing.InAppBillingService.LACK"
        };

        for (String suspiciousApp : suspiciousApps) {
            if (packageName.contains(suspiciousApp)) {
                sendSecurityAlert("Suspicious app detected: " + packageName, "high");
                break;
            }
        }
    }

    private void detectSuspiciousActivity() {
        // Check for hook frameworks
        try {
            throw new Exception();
        } catch (Exception e) {
            for (StackTraceElement element : e.getStackTrace()) {
                if (element.getClassName().contains("de.robv.android.xposed") ||
                    element.getClassName().contains("com.android.internal.os.ZygoteInit") ||
                    element.getClassName().contains("com.saurik.substrate")) {
                    sendSecurityAlert("Hook framework detected: " + element.getClassName(), "critical");
                    break;
                }
            }
        }
        
        // Check for frida
        checkForFrida();
    }

    private void checkForFrida() {
        try {
            Process process = Runtime.getRuntime().exec("ps");
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.contains("frida") || line.contains("gum-js-loop")) {
                    sendSecurityAlert("Frida detected in process list", "critical");
                    break;
                }
            }
            reader.close();
        } catch (Exception e) {
            // Process list check failed
        }
    }

    private void checkSecurityThreats() {
        // Re-check security status periodically
        if (checkForDebugger() && !debuggerDetected) {
            debuggerDetected = true;
            sendSecurityAlert("Debugger attached during runtime", "critical");
        }
    }

    private void sendSecurityAlert(String message, String severity) {
        Log.w(TAG, "Security Alert (" + severity + "): " + message);
        
        Intent intent = new Intent("vaultix.security.alert");
        intent.putExtra("message", message);
        intent.putExtra("severity", severity);
        intent.putExtra("timestamp", System.currentTimeMillis());
        intent.putExtra("root_detected", rootDetected);
        intent.putExtra("debugger_detected", debuggerDetected);
        intent.putExtra("emulator_detected", emulatorDetected);
        sendBroadcast(intent);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Security Monitoring",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Advanced security monitoring service");
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }

    private Notification createNotification() {
        String title = stealthMode ? "Calculator" : "Vaultix Security";
        String text = stealthMode ? "Calculator app running" : "Security monitoring active";
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(stealthMode ? R.drawable.ic_calculator : R.drawable.ic_security)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build();
    }
}
