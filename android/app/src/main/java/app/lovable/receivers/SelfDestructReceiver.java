
package app.lovable.receivers;

import android.app.admin.DeviceAdminReceiver;
import android.app.admin.DevicePolicyManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import android.widget.Toast;

public class SelfDestructReceiver extends DeviceAdminReceiver {
    private static final String TAG = "SelfDestructReceiver";
    
    @Override
    public void onEnabled(Context context, Intent intent) {
        super.onEnabled(context, intent);
        Log.d(TAG, "Device admin enabled");
        Toast.makeText(context, "Vaultix security features enabled", Toast.LENGTH_SHORT).show();
        
        // Save device admin status
        SharedPreferences prefs = context.getSharedPreferences("vaultix_security", Context.MODE_PRIVATE);
        prefs.edit().putBoolean("device_admin_enabled", true).apply();
    }
    
    @Override
    public void onDisabled(Context context, Intent intent) {
        super.onDisabled(context, intent);
        Log.d(TAG, "Device admin disabled");
        Toast.makeText(context, "Vaultix security features disabled", Toast.LENGTH_SHORT).show();
        
        // Clear device admin status
        SharedPreferences prefs = context.getSharedPreferences("vaultix_security", Context.MODE_PRIVATE);
        prefs.edit().putBoolean("device_admin_enabled", false).apply();
    }
    
    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        
        String action = intent.getAction();
        if ("app.lovable.SELF_DESTRUCT".equals(action)) {
            boolean confirmed = intent.getBooleanExtra("confirmed", false);
            if (confirmed) {
                executeSelfDestruct(context);
            }
        }
    }
    
    private void executeSelfDestruct(Context context) {
        Log.w(TAG, "Executing self-destruct sequence");
        
        try {
            DevicePolicyManager dpm = (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
            if (dpm != null && dpm.isAdminActive(new android.content.ComponentName(context, SelfDestructReceiver.class))) {
                
                // Show warning
                Toast.makeText(context, "Emergency wipe initiated...", Toast.LENGTH_LONG).show();
                
                // Wait a moment then wipe
                new android.os.Handler().postDelayed(() -> {
                    try {
                        // Wipe device data (factory reset)
                        dpm.wipeData(DevicePolicyManager.WIPE_EXTERNAL_STORAGE);
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to wipe device", e);
                        // Fallback: clear app data
                        clearAppData(context);
                    }
                }, 3000); // 3 second delay
                
            } else {
                Log.w(TAG, "Device admin not active, performing app data wipe only");
                clearAppData(context);
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Self-destruct execution failed", e);
        }
    }
    
    private void clearAppData(Context context) {
        try {
            // Clear all app data
            SharedPreferences.Editor editor = context.getSharedPreferences("vaultix_vault", Context.MODE_PRIVATE).edit();
            editor.clear().apply();
            
            editor = context.getSharedPreferences("vaultix_security", Context.MODE_PRIVATE).edit();
            editor.clear().apply();
            
            editor = context.getSharedPreferences("vaultix_settings", Context.MODE_PRIVATE).edit();
            editor.clear().apply();
            
            // Clear cache and files
            context.getCacheDir().delete();
            
            Log.w(TAG, "App data cleared as part of self-destruct");
            
            // Send broadcast to app
            Intent intent = new Intent("vaultix.self.destruct.complete");
            intent.putExtra("timestamp", System.currentTimeMillis());
            context.sendBroadcast(intent);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to clear app data", e);
        }
    }
}
