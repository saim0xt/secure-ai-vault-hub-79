
package app.lovable.receivers;

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class DeviceAdminReceiver extends DeviceAdminReceiver {
    private static final String TAG = "DeviceAdminReceiver";

    @Override
    public void onEnabled(Context context, Intent intent) {
        super.onEnabled(context, intent);
        Log.d(TAG, "Device Admin enabled");
        
        // Send event to JavaScript layer
        Intent enabledIntent = new Intent("vaultix.device.admin.enabled");
        context.sendBroadcast(enabledIntent);
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        super.onDisabled(context, intent);
        Log.d(TAG, "Device Admin disabled");
        
        // Send event to JavaScript layer
        Intent disabledIntent = new Intent("vaultix.device.admin.disabled");
        context.sendBroadcast(disabledIntent);
    }

    @Override
    public void onPasswordChanged(Context context, Intent intent) {
        super.onPasswordChanged(context, intent);
        Log.d(TAG, "Device password changed");
        
        // Send security alert
        Intent passwordIntent = new Intent("vaultix.security.alert");
        passwordIntent.putExtra("type", "password_changed");
        passwordIntent.putExtra("timestamp", System.currentTimeMillis());
        context.sendBroadcast(passwordIntent);
    }

    @Override
    public void onPasswordFailed(Context context, Intent intent) {
        super.onPasswordFailed(context, intent);
        Log.d(TAG, "Device password failed");
        
        // Send security alert
        Intent failedIntent = new Intent("vaultix.security.alert");
        failedIntent.putExtra("type", "password_failed");
        failedIntent.putExtra("timestamp", System.currentTimeMillis());
        context.sendBroadcast(failedIntent);
    }
}
