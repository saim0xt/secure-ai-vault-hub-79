
package app.lovable.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.IBinder;
import android.util.Log;

import app.lovable.receivers.NetworkChangeReceiver;
import app.lovable.receivers.ScreenStateReceiver;
import app.lovable.receivers.VolumeButtonReceiver;

public class SecurityMonitorService extends Service {
    private static final String TAG = "SecurityMonitorService";
    private static final String CHANNEL_ID = "vaultix_security_channel";
    private static final int NOTIFICATION_ID = 1001;
    
    private NetworkChangeReceiver networkReceiver;
    private ScreenStateReceiver screenReceiver;
    private VolumeButtonReceiver volumeReceiver;
    
    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        setupReceivers();
        Log.d(TAG, "Security Monitor Service created");
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        
        if ("START_MONITORING".equals(action)) {
            startForeground(NOTIFICATION_ID, createNotification());
            registerReceivers();
            Log.d(TAG, "Security monitoring started");
        } else if ("STOP_MONITORING".equals(action)) {
            unregisterReceivers();
            stopForeground(true);
            stopSelf();
            Log.d(TAG, "Security monitoring stopped");
        }
        
        return START_STICKY; // Restart if killed
    }
    
    private void createNotificationChannel() {
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Vaultix Security",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("Security monitoring service");
        channel.setShowBadge(false);
        
        NotificationManager manager = getSystemService(NotificationManager.class);
        manager.createNotificationChannel(channel);
    }
    
    private Notification createNotification() {
        return new Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("Vaultix Security Active")
            .setContentText("Monitoring device security")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .build();
    }
    
    private void setupReceivers() {
        networkReceiver = new NetworkChangeReceiver();
        screenReceiver = new ScreenStateReceiver();
        volumeReceiver = new VolumeButtonReceiver();
    }
    
    private void registerReceivers() {
        // Network change receiver
        IntentFilter networkFilter = new IntentFilter();
        networkFilter.addAction("android.net.conn.CONNECTIVITY_CHANGE");
        registerReceiver(networkReceiver, networkFilter);
        
        // Screen state receiver
        IntentFilter screenFilter = new IntentFilter();
        screenFilter.addAction(Intent.ACTION_SCREEN_OFF);
        screenFilter.addAction(Intent.ACTION_SCREEN_ON);
        screenFilter.addAction(Intent.ACTION_USER_PRESENT);
        registerReceiver(screenReceiver, screenFilter);
        
        // Volume button receiver
        IntentFilter volumeFilter = new IntentFilter();
        volumeFilter.addAction("android.media.VOLUME_CHANGED_ACTION");
        volumeFilter.setPriority(1000);
        registerReceiver(volumeReceiver, volumeFilter);
    }
    
    private void unregisterReceivers() {
        try {
            if (networkReceiver != null) {
                unregisterReceiver(networkReceiver);
            }
            if (screenReceiver != null) {
                unregisterReceiver(screenReceiver);
            }
            if (volumeReceiver != null) {
                unregisterReceiver(volumeReceiver);
            }
        } catch (IllegalArgumentException e) {
            Log.w(TAG, "Receiver already unregistered: " + e.getMessage());
        }
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        unregisterReceivers();
        Log.d(TAG, "Security Monitor Service destroyed");
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
