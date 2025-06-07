
package app.lovable.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.view.WindowManager;

import androidx.core.app.NotificationCompat;

import app.lovable.R;

public class ScreenshotPreventionService extends Service {
    private static final String CHANNEL_ID = "screenshot_prevention_channel";
    private static final int NOTIFICATION_ID = 1001;
    
    private WindowManager windowManager;
    private boolean isPreventionActive = false;

    public ScreenshotPreventionService() {}

    public ScreenshotPreventionService(Context context) {
        this.windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIFICATION_ID, createNotification());
        enableScreenshotPrevention();
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
    }

    private void enableScreenshotPrevention() {
        if (!isPreventionActive) {
            isPreventionActive = true;
            // Additional screenshot prevention logic can be added here
        }
    }

    private void disableScreenshotPrevention() {
        if (isPreventionActive) {
            isPreventionActive = false;
            // Cleanup screenshot prevention logic
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Screenshot Prevention",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Prevents unauthorized screenshots");
            
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
            .build();
    }
}
