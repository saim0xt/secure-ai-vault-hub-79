
package app.lovable.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import app.lovable.services.SecurityMonitorService;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || 
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            
            Log.d(TAG, "Device boot completed or app updated - starting security services");
            
            // Start security monitoring service on boot
            Intent serviceIntent = new Intent(context, SecurityMonitorService.class);
            serviceIntent.setAction("START_MONITORING");
            context.startForegroundService(serviceIntent);
            
            // Send boot event to JavaScript layer
            Intent bootIntent = new Intent("vaultix.boot.completed");
            context.sendBroadcast(bootIntent);
        }
    }
}
