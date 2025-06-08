
package app.lovable.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.provider.Settings;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;

import androidx.core.app.NotificationCompat;

import java.util.Calendar;
import java.util.List;
import java.util.SortedMap;
import java.util.TreeMap;

import app.lovable.R;

public class SecurityMonitorService extends Service {
    private static final String TAG = "SecurityMonitorService";
    private static final String CHANNEL_ID = "security_monitor_channel";
    private static final int NOTIFICATION_ID = 1002;
    
    private WindowManager windowManager;
    private View overlayView;
    private boolean isMonitoring = false;
    private boolean isStealthMode = false;
    private SecurityReceiver securityReceiver;
    private UsageStatsManager usageStatsManager;
    private PackageManager packageManager;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        usageStatsManager = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
        packageManager = getPackageManager();
        
        securityReceiver = new SecurityReceiver();
        registerSecurityReceivers();
        
        Log.d(TAG, "SecurityMonitorService created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        
        if ("START_MONITORING".equals(action)) {
            startMonitoring();
        } else if ("STOP_MONITORING".equals(action)) {
            stopMonitoring();
        } else if ("ENABLE_STEALTH".equals(action)) {
            enableStealthMode();
        } else if ("DISABLE_STEALTH".equals(action)) {
            disableStealthMode();
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
        if (securityReceiver != null) {
            try {
                unregisterReceiver(securityReceiver);
            } catch (IllegalArgumentException e) {
                Log.w(TAG, "Security receiver was not registered");
            }
        }
        Log.d(TAG, "SecurityMonitorService destroyed");
    }

    private void startMonitoring() {
        if (isMonitoring) return;
        
        if (Settings.canDrawOverlays(this)) {
            createSecurityOverlay();
            isMonitoring = true;
            startForeground(NOTIFICATION_ID, createNotification("Security monitoring active"));
            
            // Start usage monitoring
            startUsageMonitoring();
            
            Log.d(TAG, "Security monitoring started");
        } else {
            Log.e(TAG, "Cannot start monitoring - overlay permission not granted");
            stopSelf();
        }
    }

    private void stopMonitoring() {
        if (!isMonitoring) return;
        
        removeSecurityOverlay();
        isMonitoring = false;
        stopForeground(true);
        
        Log.d(TAG, "Security monitoring stopped");
    }

    private void enableStealthMode() {
        isStealthMode = true;
        if (isMonitoring) {
            updateNotification("Stealth mode active");
        } else {
            startMonitoring();
        }
        
        // Hide overlay in stealth mode
        if (overlayView != null) {
            overlayView.setVisibility(View.GONE);
        }
        
        Log.d(TAG, "Stealth mode enabled");
    }

    private void disableStealthMode() {
        isStealthMode = false;
        if (isMonitoring) {
            updateNotification("Security monitoring active");
            if (overlayView != null) {
                overlayView.setVisibility(View.VISIBLE);
            }
        }
        
        Log.d(TAG, "Stealth mode disabled");
    }

    private void createSecurityOverlay() {
        if (overlayView != null) return;
        
        try {
            // Create minimal overlay (1x1 pixel) for security monitoring
            overlayView = new View(this);
            overlayView.setBackgroundColor(android.graphics.Color.TRANSPARENT);
            
            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                1, 1,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O 
                    ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                    : WindowManager.LayoutParams.TYPE_PHONE,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE 
                    | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                    | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                    | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
            );
            
            params.gravity = Gravity.TOP | Gravity.LEFT;
            params.x = 0;
            params.y = 0;
            
            windowManager.addView(overlayView, params);
            
            // Set up touch detection for tampering
            overlayView.setOnSystemUiVisibilityChangeListener(visibility -> {
                if ((visibility & View.SYSTEM_UI_FLAG_HIDE_NAVIGATION) != 0) {
                    onTamperingDetected("System UI modification detected");
                }
            });
            
            Log.d(TAG, "Security overlay created");
        } catch (Exception e) {
            Log.e(TAG, "Failed to create security overlay", e);
        }
    }

    private void removeSecurityOverlay() {
        if (overlayView != null && windowManager != null) {
            try {
                windowManager.removeView(overlayView);
                overlayView = null;
                Log.d(TAG, "Security overlay removed");
            } catch (Exception e) {
                Log.e(TAG, "Failed to remove security overlay", e);
            }
        }
    }

    private void registerSecurityReceivers() {
        IntentFilter filter = new IntentFilter();
        
        // Screen state changes
        filter.addAction(Intent.ACTION_SCREEN_OFF);
        filter.addAction(Intent.ACTION_SCREEN_ON);
        filter.addAction(Intent.ACTION_USER_PRESENT);
        
        // Security events
        filter.addAction("android.intent.action.PACKAGE_ADDED");
        filter.addAction("android.intent.action.PACKAGE_REMOVED");
        filter.addAction("android.net.conn.CONNECTIVITY_CHANGE");
        filter.addAction("android.intent.action.BOOT_COMPLETED");
        filter.addAction("android.intent.action.DEVICE_STORAGE_LOW");
        
        // Custom Vaultix events
        filter.addAction("vaultix.security.alert");
        filter.addAction("vaultix.tamper.detected");
        
        registerReceiver(securityReceiver, filter);
        Log.d(TAG, "Security receivers registered");
    }

    private void startUsageMonitoring() {
        // Monitor app usage for suspicious activity
        new Thread(() -> {
            while (isMonitoring) {
                try {
                    checkForSuspiciousApps();
                    Thread.sleep(30000); // Check every 30 seconds
                } catch (InterruptedException e) {
                    break;
                } catch (Exception e) {
                    Log.e(TAG, "Error in usage monitoring", e);
                }
            }
        }).start();
    }

    private void checkForSuspiciousApps() {
        if (usageStatsManager == null) return;
        
        try {
            Calendar cal = Calendar.getInstance();
            cal.add(Calendar.MINUTE, -5); // Last 5 minutes
            long endTime = System.currentTimeMillis();
            long startTime = cal.getTimeInMillis();
            
            SortedMap<Long, UsageStats> recentApps = new TreeMap<>();
            List<UsageStats> usageStatsList = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_BEST, startTime, endTime);
            
            for (UsageStats usageStats : usageStatsList) {
                if (usageStats.getLastTimeUsed() > startTime) {
                    recentApps.put(usageStats.getLastTimeUsed(), usageStats);
                }
            }
            
            // Check for suspicious apps
            for (UsageStats stats : recentApps.values()) {
                if (isSuspiciousApp(stats.getPackageName())) {
                    onSuspiciousAppDetected(stats.getPackageName());
                }
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Error checking suspicious apps", e);
        }
    }

    private boolean isSuspiciousApp(String packageName) {
        // List of potentially suspicious app categories
        String[] suspiciousKeywords = {
            "hack", "crack", "root", "xposed", "lucky", "game", "cheat",
            "spy", "monitor", "tracker", "keylogger", "screen", "record"
        };
        
        try {
            ApplicationInfo appInfo = packageManager.getApplicationInfo(packageName, 0);
            String appName = packageManager.getApplicationLabel(appInfo).toString().toLowerCase();
            
            for (String keyword : suspiciousKeywords) {
                if (appName.contains(keyword) || packageName.toLowerCase().contains(keyword)) {
                    return true;
                }
            }
        } catch (PackageManager.NameNotFoundException e) {
            // App not found, might be suspicious
            return true;
        }
        
        return false;
    }

    private void onSuspiciousAppDetected(String packageName) {
        Log.w(TAG, "Suspicious app detected: " + packageName);
        
        Intent intent = new Intent("vaultix.security.alert");
        intent.putExtra("type", "suspicious_app");
        intent.putExtra("package", packageName);
        intent.putExtra("timestamp", System.currentTimeMillis());
        sendBroadcast(intent);
    }

    private void onTamperingDetected(String reason) {
        Log.w(TAG, "Tampering detected: " + reason);
        
        Intent intent = new Intent("vaultix.tamper.detected");
        intent.putExtra("reason", reason);
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
            channel.setDescription("Vaultix security monitoring service");
            channel.setShowBadge(false);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }

    private Notification createNotification(String contentText) {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Vaultix Security")
            .setContentText(contentText)
            .setSmallIcon(R.drawable.ic_security)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setShowWhen(false)
            .build();
    }

    private void updateNotification(String contentText) {
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        manager.notify(NOTIFICATION_ID, createNotification(contentText));
    }

    private class SecurityReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            Log.d(TAG, "Security event received: " + action);
            
            switch (action) {
                case Intent.ACTION_SCREEN_OFF:
                    onScreenStateChanged(false);
                    break;
                case Intent.ACTION_SCREEN_ON:
                    onScreenStateChanged(true);
                    break;
                case Intent.ACTION_USER_PRESENT:
                    onUserPresent();
                    break;
                case "android.intent.action.PACKAGE_ADDED":
                    onPackageChanged("added", intent.getData().getSchemeSpecificPart());
                    break;
                case "android.intent.action.PACKAGE_REMOVED":
                    onPackageChanged("removed", intent.getData().getSchemeSpecificPart());
                    break;
                case "android.net.conn.CONNECTIVITY_CHANGE":
                    onNetworkChanged();
                    break;
                case "vaultix.security.alert":
                    onSecurityAlert(intent);
                    break;
                case "vaultix.tamper.detected":
                    onTamperDetected(intent);
                    break;
            }
        }
        
        private void onScreenStateChanged(boolean screenOn) {
            Intent intent = new Intent("vaultix.screen.state");
            intent.putExtra("screen_on", screenOn);
            intent.putExtra("timestamp", System.currentTimeMillis());
            sendBroadcast(intent);
        }
        
        private void onUserPresent() {
            Intent intent = new Intent("vaultix.user.present");
            intent.putExtra("timestamp", System.currentTimeMillis());
            sendBroadcast(intent);
        }
        
        private void onPackageChanged(String action, String packageName) {
            if (isSuspiciousApp(packageName)) {
                Intent intent = new Intent("vaultix.security.alert");
                intent.putExtra("type", "package_" + action);
                intent.putExtra("package", packageName);
                intent.putExtra("timestamp", System.currentTimeMillis());
                sendBroadcast(intent);
            }
        }
        
        private void onNetworkChanged() {
            Intent intent = new Intent("vaultix.network.changed");
            intent.putExtra("timestamp", System.currentTimeMillis());
            sendBroadcast(intent);
        }
        
        private void onSecurityAlert(Intent intent) {
            // Forward security alerts to the app
            Log.w(TAG, "Security alert: " + intent.getStringExtra("type"));
        }
        
        private void onTamperDetected(Intent intent) {
            // Handle tampering detection
            Log.w(TAG, "Tampering detected: " + intent.getStringExtra("reason"));
        }
    }
}
