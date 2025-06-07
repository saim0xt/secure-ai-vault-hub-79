
package app.lovable.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import app.lovable.R;

public class AutoBackupService extends Service {
    private static final String CHANNEL_ID = "auto_backup_channel";
    private static final int NOTIFICATION_ID = 1004;
    private static final String TAG = "AutoBackupService";
    
    private Handler handler;
    private Runnable backupRunnable;
    private boolean isBackupActive = false;
    private long backupInterval = 24 * 60 * 60 * 1000; // 24 hours default

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        handler = new Handler();
        loadBackupSettings();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        
        if ("START_BACKUP".equals(action)) {
            startAutoBackup();
        } else if ("STOP_BACKUP".equals(action)) {
            stopAutoBackup();
        } else if ("PERFORM_BACKUP".equals(action)) {
            performBackup();
        }
        
        if (isBackupActive) {
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
        stopAutoBackup();
    }

    private void startAutoBackup() {
        if (!isBackupActive) {
            isBackupActive = true;
            scheduleNextBackup();
            Log.d(TAG, "Auto backup started with interval: " + backupInterval + "ms");
        }
    }

    private void stopAutoBackup() {
        if (isBackupActive) {
            isBackupActive = false;
            if (backupRunnable != null) {
                handler.removeCallbacks(backupRunnable);
            }
            Log.d(TAG, "Auto backup stopped");
        }
    }

    private void scheduleNextBackup() {
        if (!isBackupActive) return;
        
        backupRunnable = new Runnable() {
            @Override
            public void run() {
                performBackup();
                if (isBackupActive) {
                    scheduleNextBackup(); // Schedule next backup
                }
            }
        };
        
        handler.postDelayed(backupRunnable, backupInterval);
    }

    private void performBackup() {
        Log.d(TAG, "Performing auto backup...");
        
        try {
            // Send backup event to JavaScript layer
            Intent backupIntent = new Intent("vaultix.auto.backup");
            backupIntent.putExtra("status", "started");
            backupIntent.putExtra("timestamp", System.currentTimeMillis());
            sendBroadcast(backupIntent);
            
            // Update notification
            updateNotification("Backup in progress...");
            
            // Simulate backup process
            new Thread(() -> {
                try {
                    Thread.sleep(5000); // Simulate backup time
                    
                    // Send completion event
                    Intent completeIntent = new Intent("vaultix.auto.backup");
                    completeIntent.putExtra("status", "completed");
                    completeIntent.putExtra("timestamp", System.currentTimeMillis());
                    sendBroadcast(completeIntent);
                    
                    updateNotification("Next backup in " + (backupInterval / 3600000) + " hours");
                    
                } catch (InterruptedException e) {
                    Log.e(TAG, "Backup interrupted", e);
                }
            }).start();
            
        } catch (Exception e) {
            Log.e(TAG, "Backup failed", e);
            
            Intent errorIntent = new Intent("vaultix.auto.backup");
            errorIntent.putExtra("status", "failed");
            errorIntent.putExtra("error", e.getMessage());
            sendBroadcast(errorIntent);
        }
    }

    private void loadBackupSettings() {
        SharedPreferences prefs = getSharedPreferences("vaultix_backup", Context.MODE_PRIVATE);
        backupInterval = prefs.getLong("backup_interval", 24 * 60 * 60 * 1000);
    }

    private void updateNotification(String text) {
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Vaultix Auto Backup")
            .setContentText(text)
            .setSmallIcon(R.drawable.ic_backup)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build();
            
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        manager.notify(NOTIFICATION_ID, notification);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Auto Backup",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Automatic backup service");
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }

    private Notification createNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Vaultix Auto Backup")
            .setContentText("Auto backup active")
            .setSmallIcon(R.drawable.ic_backup)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build();
    }
}
