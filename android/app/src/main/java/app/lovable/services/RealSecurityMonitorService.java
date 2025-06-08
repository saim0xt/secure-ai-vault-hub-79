
package app.lovable.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSObject;

import app.lovable.MainActivity;
import app.lovable.R;

public class RealSecurityMonitorService extends Service implements RealTamperDetectionService.TamperDetectionListener {
    
    private static final String TAG = "SecurityMonitor";
    private static final String CHANNEL_ID = "VaultixSecurityChannel";
    private static final int NOTIFICATION_ID = 1001;
    
    private RealIntruderDetectionService intruderService;
    private RealTamperDetectionService tamperService;
    private RealNativeNotificationService notificationService;
    private boolean monitoring = false;
    
    @Override
    public void onCreate() {
        super.onCreate();
        
        createNotificationChannel();
        
        // Initialize security services
        intruderService = new RealIntruderDetectionService(this);
        tamperService = new RealTamperDetectionService(this);
        tamperService.setTamperDetectionListener(this);
        notificationService = new RealNativeNotificationService(this);
        
        Log.d(TAG, "Security monitor service created");
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIFICATION_ID, createNotification());
        
        if (!monitoring) {
            startSecurityMonitoring();
        }
        
        return START_STICKY; // Restart if killed
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        stopSecurityMonitoring();
        Log.d(TAG, "Security monitor service destroyed");
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Vaultix Security Monitoring",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Monitoring device security in background");
            channel.setSound(null, null);
            channel.enableVibration(false);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }
    
    private Notification createNotification() {
        Intent intent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, intent, 
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE : 
                PendingIntent.FLAG_UPDATE_CURRENT
        );
        
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Vaultix Security Active")
            .setContentText("Monitoring device security")
            .setSmallIcon(R.drawable.ic_security)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .build();
    }
    
    private void startSecurityMonitoring() {
        if (monitoring) return;
        
        monitoring = true;
        
        // Start all security monitoring services
        intruderService.startMonitoring();
        tamperService.startMonitoring();
        
        Log.d(TAG, "Security monitoring started");
        
        // Show notification that monitoring is active
        notificationService.showSecurityAlert(
            "Security Monitoring Active",
            "Vaultix is now monitoring your device for security threats",
            "monitoring_started"
        );
    }
    
    private void stopSecurityMonitoring() {
        if (!monitoring) return;
        
        monitoring = false;
        
        // Stop all security monitoring services
        intruderService.stopMonitoring();
        tamperService.stopMonitoring();
        
        Log.d(TAG, "Security monitoring stopped");
    }
    
    @Override
    public void onTamperDetected(String reason, JSObject details) {
        Log.w(TAG, "Tamper detected by monitor service: " + reason);
        
        // Capture intruder photo if possible
        String photoPath = intruderService.captureIntruderPhoto();
        
        // Send critical security alert
        notificationService.showSecurityAlert(
            "SECURITY THREAT DETECTED",
            "Tampering attempt detected: " + reason,
            "tamper_detected"
        );
        
        // Log the security event
        logSecurityEvent("tamper_detected", reason, details, photoPath);
        
        // Trigger additional security measures
        triggerSecurityResponse(reason, details);
    }
    
    private void logSecurityEvent(String eventType, String details, JSObject data, String photoPath) {
        // Here you would typically log to a secure database or file
        Log.i(TAG, String.format("Security Event: %s - %s", eventType, details));
        
        if (photoPath != null) {
            Log.i(TAG, "Intruder photo captured: " + photoPath);
        }
    }
    
    private void triggerSecurityResponse(String reason, JSObject details) {
        // Implement security response based on threat level
        if (reason.contains("root") || reason.contains("emulator")) {
            // High threat - consider data protection measures
            notificationService.showSecurityAlert(
                "HIGH SECURITY RISK",
                "Device security compromised. Consider securing your data.",
                "high_risk"
            );
        } else if (reason.contains("debug")) {
            // Medium threat - debugging detected
            notificationService.showSecurityAlert(
                "DEBUG MODE DETECTED",
                "App is running in debug mode. Security features may be limited.",
                "debug_mode"
            );
        }
    }
    
    public boolean isMonitoring() {
        return monitoring;
    }
    
    public void captureIntruderPhoto() {
        if (intruderService != null) {
            String photoPath = intruderService.captureIntruderPhoto();
            if (photoPath != null) {
                notificationService.showSecurityAlert(
                    "Intruder Photo Captured",
                    "Unauthorized access attempt recorded",
                    "intruder_photo"
                );
            }
        }
    }
}
