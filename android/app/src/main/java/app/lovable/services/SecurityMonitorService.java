
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

import androidx.core.app.NotificationCompat;

import app.lovable.R;

import java.util.List;

public class SecurityMonitorService extends Service {
    private static final String CHANNEL_ID = "security_monitor_channel";
    private static final int NOTIFICATION_ID = 1003;
    
    private WindowManager windowManager;
    private View overlayView;
    private Handler handler;
    private Runnable monitoringRunnable;
    private boolean isMonitoring = false;
    private boolean stealthMode = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        handler = new Handler();
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

    private void startMonitoring() {
        if (!isMonitoring && canDrawOverlays()) {
            createSecurityOverlay();
            startUsageMonitoring();
            isMonitoring = true;
        }
    }

    private void stopMonitoring() {
        if (isMonitoring) {
            removeSecurityOverlay();
            stopUsageMonitoring();
            isMonitoring = false;
        }
    }

    private void enableStealthMode() {
        stealthMode = true;
        startMonitoring();
    }

    private void disableStealthMode() {
        stealthMode = false;
        if (!isMonitoring) {
            stopMonitoring();
        }
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
        } catch (Exception e) {
            // Handle overlay permission not granted
        }
    }

    private void removeSecurityOverlay() {
        if (overlayView != null) {
            try {
                windowManager.removeView(overlayView);
            } catch (Exception e) {
                // View already removed
            }
            overlayView = null;
        }
    }

    private void startUsageMonitoring() {
        monitoringRunnable = new Runnable() {
            @Override
            public void run() {
                checkAppUsage();
                detectSuspiciousActivity();
                handler.postDelayed(this, 5000); // Check every 5 seconds
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

            // Analyze usage patterns for suspicious activity
            for (UsageStats usageStat : stats) {
                if (usageStat.getLastTimeUsed() > startTime) {
                    // App was used recently - check if it's suspicious
                    checkSuspiciousApp(usageStat.getPackageName());
                }
            }
        }
    }

    private void checkSuspiciousApp(String packageName) {
        // List of apps that might indicate tampering attempts
        String[] suspiciousApps = {
            "com.android.shell",
            "com.android.packageinstaller",
            "com.android.settings",
            "com.android.systemui"
        };

        for (String suspiciousApp : suspiciousApps) {
            if (packageName.contains(suspiciousApp)) {
                sendSecurityAlert("Suspicious app detected: " + packageName);
                break;
            }
        }
    }

    private void detectSuspiciousActivity() {
        // Implement additional tamper detection logic
        // This could include checking for:
        // - Root detection
        // - Debugger detection
        // - Emulator detection
        // - Hook detection
    }

    private void sendSecurityAlert(String message) {
        Intent intent = new Intent("vaultix.security.alert");
        intent.putExtra("message", message);
        intent.putExtra("timestamp", System.currentTimeMillis());
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
