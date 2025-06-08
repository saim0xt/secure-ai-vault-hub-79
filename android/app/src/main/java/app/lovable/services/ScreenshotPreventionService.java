
package app.lovable.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.IBinder;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;

public class ScreenshotPreventionService extends Service {
    private static final String TAG = "ScreenshotPrevention";
    private static final String CHANNEL_ID = "vaultix_screenshot_channel";
    private static final int NOTIFICATION_ID = 1002;
    
    private WindowManager windowManager;
    private View overlayView;
    
    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        Log.d(TAG, "Screenshot Prevention Service created");
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIFICATION_ID, createNotification());
        createOverlay();
        Log.d(TAG, "Screenshot prevention started");
        return START_STICKY;
    }
    
    private void createNotificationChannel() {
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Screenshot Prevention",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Prevents unauthorized screenshots");
        channel.setShowBadge(false);
        
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.createNotificationChannel(channel);
    }
    
    private Notification createNotification() {
        return new Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("Screenshot Protection Active")
            .setContentText("Preventing unauthorized screenshots")
            .setSmallIcon(android.R.drawable.ic_secure)
            .setOngoing(true)
            .build();
    }
    
    private void createOverlay() {
        try {
            windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
            
            overlayView = new View(this);
            overlayView.setBackgroundColor(0x00000000); // Transparent
            
            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                1, 1,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE |
                WindowManager.LayoutParams.FLAG_SECURE,
                PixelFormat.TRANSLUCENT
            );
            
            params.gravity = Gravity.TOP | Gravity.LEFT;
            params.x = 0;
            params.y = 0;
            
            windowManager.addView(overlayView, params);
            Log.d(TAG, "Screenshot prevention overlay created");
        } catch (Exception e) {
            Log.e(TAG, "Failed to create overlay: " + e.getMessage());
        }
    }
    
    private void removeOverlay() {
        try {
            if (windowManager != null && overlayView != null) {
                windowManager.removeView(overlayView);
                overlayView = null;
                Log.d(TAG, "Screenshot prevention overlay removed");
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to remove overlay: " + e.getMessage());
        }
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        removeOverlay();
        Log.d(TAG, "Screenshot Prevention Service destroyed");
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
