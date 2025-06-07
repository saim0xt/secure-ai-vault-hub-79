
package app.lovable.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioManager;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;

import app.lovable.R;

public class VolumeKeyService extends Service {
    private static final String CHANNEL_ID = "volume_key_service_channel";
    private static final int NOTIFICATION_ID = 1002;
    
    private VolumeKeyReceiver volumeReceiver;
    private boolean isCaptureEnabled = false;

    public VolumeKeyService() {}

    public VolumeKeyService(Context context) {
        volumeReceiver = new VolumeKeyReceiver();
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        volumeReceiver = new VolumeKeyReceiver();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        
        if ("ENABLE_CAPTURE".equals(action)) {
            enableVolumeKeyCapture();
        } else if ("DISABLE_CAPTURE".equals(action)) {
            disableVolumeKeyCapture();
        }
        
        if (isCaptureEnabled) {
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
        disableVolumeKeyCapture();
    }

    private void enableVolumeKeyCapture() {
        if (!isCaptureEnabled) {
            IntentFilter filter = new IntentFilter();
            filter.addAction("android.media.VOLUME_CHANGED_ACTION");
            registerReceiver(volumeReceiver, filter);
            isCaptureEnabled = true;
        }
    }

    private void disableVolumeKeyCapture() {
        if (isCaptureEnabled) {
            try {
                unregisterReceiver(volumeReceiver);
            } catch (IllegalArgumentException e) {
                // Receiver not registered
            }
            isCaptureEnabled = false;
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Volume Key Service",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Monitors volume key presses for security");
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }

    private Notification createNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Vaultix Volume Monitor")
            .setContentText("Volume key monitoring active")
            .setSmallIcon(R.drawable.ic_volume)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build();
    }

    private class VolumeKeyReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            if ("android.media.VOLUME_CHANGED_ACTION".equals(intent.getAction())) {
                // Send event to JavaScript layer
                Intent eventIntent = new Intent("vaultix.volume.key.pressed");
                context.sendBroadcast(eventIntent);
            }
        }
    }
}
