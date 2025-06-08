
package app.lovable.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import app.lovable.services.RealSecurityMonitorService;

public class BootReceiver extends BroadcastReceiver {
    
    private static final String TAG = "BootReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || 
            "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            
            Log.d(TAG, "Boot completed, starting security services");
            
            // Start security monitoring service
            Intent serviceIntent = new Intent(context, RealSecurityMonitorService.class);
            context.startForegroundService(serviceIntent);
        }
    }
}
