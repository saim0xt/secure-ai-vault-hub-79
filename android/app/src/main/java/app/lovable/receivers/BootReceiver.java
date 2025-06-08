
package app.lovable.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import app.lovable.services.SecurityMonitorService;
import app.lovable.services.ScreenshotPreventionService;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action) ||
            Intent.ACTION_PACKAGE_REPLACED.equals(action)) {
            
            Log.d(TAG, "Boot completed or package replaced: " + action);
            
            // Check if security features should be auto-started
            SharedPreferences prefs = context.getSharedPreferences("vaultix_security", Context.MODE_PRIVATE);
            boolean autoStartSecurity = prefs.getBoolean("auto_start_security", false);
            boolean stealthMode = prefs.getBoolean("stealth_mode", false);
            
            if (autoStartSecurity) {
                // Start security monitoring service
                Intent securityIntent = new Intent(context, SecurityMonitorService.class);
                securityIntent.setAction("START_MONITORING");
                
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(securityIntent);
                } else {
                    context.startService(securityIntent);
                }
                
                // Start screenshot prevention if enabled
                boolean screenshotPrevention = prefs.getBoolean("screenshot_prevention", false);
                if (screenshotPrevention) {
                    Intent screenshotIntent = new Intent(context, ScreenshotPreventionService.class);
                    screenshotIntent.setAction("ENABLE_PREVENTION");
                    
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(screenshotIntent);
                    } else {
                        context.startService(screenshotIntent);
                    }
                }
                
                Log.d(TAG, "Security services auto-started");
            }
            
            // Send boot completed event to app
            Intent bootIntent = new Intent("vaultix.boot.completed");
            bootIntent.putExtra("action", action);
            bootIntent.putExtra("timestamp", System.currentTimeMillis());
            context.sendBroadcast(bootIntent);
        }
    }
}
