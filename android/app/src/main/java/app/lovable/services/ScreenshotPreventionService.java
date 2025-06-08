
package app.lovable.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.database.ContentObserver;
import android.net.Uri;
import android.os.Handler;
import android.os.FileObserver;
import android.os.Environment;

import androidx.core.app.NotificationCompat;

import java.io.File;

import app.lovable.R;

public class ScreenshotPreventionService extends Service {
    private static final String TAG = "ScreenshotPreventionService";
    private static final String CHANNEL_ID = "screenshot_prevention_channel";
    private static final int NOTIFICATION_ID = 1001;
    
    private WindowManager windowManager;
    private View preventionOverlay;
    private boolean isPreventionActive = false;
    private ScreenshotObserver screenshotObserver;
    private FileObserver screenshotFileObserver;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        
        Log.d(TAG, "ScreenshotPreventionService created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        
        if ("ENABLE_PREVENTION".equals(action)) {
            enableScreenshotPrevention();
        } else if ("DISABLE_PREVENTION".equals(action)) {
            disableScreenshotPrevention();
        } else {
            enableScreenshotPrevention(); // Default action
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
        disableScreenshotPrevention();
        Log.d(TAG, "ScreenshotPreventionService destroyed");
    }

    private void enableScreenshotPrevention() {
        if (isPreventionActive) return;
        
        try {
            // Create prevention overlay
            if (Settings.canDrawOverlays(this)) {
                createPreventionOverlay();
            }
            
            // Monitor screenshot attempts
            startScreenshotMonitoring();
            
            // Start foreground service
            startForeground(NOTIFICATION_ID, createNotification());
            
            isPreventionActive = true;
            Log.d(TAG, "Screenshot prevention enabled");
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to enable screenshot prevention", e);
        }
    }

    private void disableScreenshotPrevention() {
        if (!isPreventionActive) return;
        
        try {
            // Remove prevention overlay
            removePreventionOverlay();
            
            // Stop screenshot monitoring
            stopScreenshotMonitoring();
            
            isPreventionActive = false;
            Log.d(TAG, "Screenshot prevention disabled");
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to disable screenshot prevention", e);
        }
    }

    private void createPreventionOverlay() {
        if (preventionOverlay != null) return;
        
        try {
            // Create transparent overlay to detect screenshot attempts
            preventionOverlay = new View(this);
            preventionOverlay.setBackgroundColor(android.graphics.Color.TRANSPARENT);
            
            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                1, 1,
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O 
                    ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                    : WindowManager.LayoutParams.TYPE_SYSTEM_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE 
                    | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                    | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
            );
            
            params.gravity = Gravity.TOP | Gravity.LEFT;
            
            windowManager.addView(preventionOverlay, params);
            
            Log.d(TAG, "Prevention overlay created");
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to create prevention overlay", e);
        }
    }

    private void removePreventionOverlay() {
        if (preventionOverlay != null && windowManager != null) {
            try {
                windowManager.removeView(preventionOverlay);
                preventionOverlay = null;
                Log.d(TAG, "Prevention overlay removed");
            } catch (Exception e) {
                Log.e(TAG, "Failed to remove prevention overlay", e);
            }
        }
    }

    private void startScreenshotMonitoring() {
        try {
            // Monitor media store for new screenshots
            screenshotObserver = new ScreenshotObserver(new Handler());
            getContentResolver().registerContentObserver(
                android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                true,
                screenshotObserver
            );
            
            // Monitor screenshot directory with FileObserver
            String screenshotPath = Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_PICTURES) + "/Screenshots";
            File screenshotDir = new File(screenshotPath);
            
            if (screenshotDir.exists() || screenshotDir.mkdirs()) {
                screenshotFileObserver = new FileObserver(screenshotPath, FileObserver.CREATE) {
                    @Override
                    public void onEvent(int event, String path) {
                        if (event == FileObserver.CREATE && path != null) {
                            onScreenshotDetected("File created: " + path);
                        }
                    }
                };
                screenshotFileObserver.startWatching();
            }
            
            Log.d(TAG, "Screenshot monitoring started");
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to start screenshot monitoring", e);
        }
    }

    private void stopScreenshotMonitoring() {
        try {
            if (screenshotObserver != null) {
                getContentResolver().unregisterContentObserver(screenshotObserver);
                screenshotObserver = null;
            }
            
            if (screenshotFileObserver != null) {
                screenshotFileObserver.stopWatching();
                screenshotFileObserver = null;
            }
            
            Log.d(TAG, "Screenshot monitoring stopped");
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop screenshot monitoring", e);
        }
    }

    private void onScreenshotDetected(String details) {
        Log.w(TAG, "Screenshot attempt detected: " + details);
        
        // Send broadcast to app
        Intent intent = new Intent("vaultix.screenshot.detected");
        intent.putExtra("details", details);
        intent.putExtra("timestamp", System.currentTimeMillis());
        sendBroadcast(intent);
        
        // Log security event
        Intent securityIntent = new Intent("vaultix.security.alert");
        securityIntent.putExtra("type", "screenshot_attempt");
        securityIntent.putExtra("details", details);
        securityIntent.putExtra("timestamp", System.currentTimeMillis());
        sendBroadcast(securityIntent);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Screenshot Prevention",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Prevents unauthorized screenshots and screen recording");
            channel.setShowBadge(false);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }

    private Notification createNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Vaultix Security Active")
            .setContentText("Screenshot prevention enabled")
            .setSmallIcon(R.drawable.ic_security)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setShowWhen(false)
            .build();
    }

    private class ScreenshotObserver extends ContentObserver {
        public ScreenshotObserver(Handler handler) {
            super(handler);
        }

        @Override
        public void onChange(boolean selfChange, Uri uri) {
            super.onChange(selfChange, uri);
            
            if (uri != null) {
                String path = uri.getPath();
                if (path != null && (path.toLowerCase().contains("screenshot") || 
                                   path.toLowerCase().contains("screen"))) {
                    onScreenshotDetected("Media store change: " + uri.toString());
                }
            }
        }
    }
}
