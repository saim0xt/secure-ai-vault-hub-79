
package app.lovable.services;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import app.lovable.MainActivity;
import app.lovable.R;

public class RealNativeNotificationService {
    private Context context;
    private NotificationManagerCompat notificationManager;
    private static final String CHANNEL_ID = "vaultix_security_channel";
    private static final String CHANNEL_NAME = "Vaultix Security Alerts";
    private static final int NOTIFICATION_ID = 1001;
    
    public RealNativeNotificationService(Context context) {
        this.context = context;
        this.notificationManager = NotificationManagerCompat.from(context);
        createNotificationChannel();
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Security alerts and notifications from Vaultix");
            channel.enableLights(true);
            channel.enableVibration(true);
            
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }
    
    public void showSecurityAlert(String title, String message, String alertType) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        intent.putExtra("alert_type", alertType);
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 0, intent, 
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE : 
                PendingIntent.FLAG_UPDATE_CURRENT
        );
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_security)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setDefaults(NotificationCompat.DEFAULT_ALL);
        
        // Set notification style based on alert type
        if ("break_in".equals(alertType) || "unauthorized_access".equals(alertType)) {
            builder.setColor(0xFFD32F2F); // Red for critical alerts
            builder.setLights(0xFFD32F2F, 1000, 1000);
        } else if ("tamper".equals(alertType)) {
            builder.setColor(0xFFFF9800); // Orange for warnings
        } else {
            builder.setColor(0xFF1976D2); // Blue for info
        }
        
        notificationManager.notify(NOTIFICATION_ID, builder.build());
    }
    
    public void showPermissionRequest(String permission, String reason) {
        String title = "Permission Required";
        String message = "Vaultix needs " + permission + " permission. " + reason;
        
        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra("permission_request", permission);
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE : 
                PendingIntent.FLAG_UPDATE_CURRENT
        );
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_security)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent);
        
        notificationManager.notify(NOTIFICATION_ID + 1, builder.build());
    }
    
    public void clearAllNotifications() {
        notificationManager.cancelAll();
    }
    
    public boolean areNotificationsEnabled() {
        return notificationManager.areNotificationsEnabled();
    }
}
