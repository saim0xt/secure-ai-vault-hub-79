
package app.lovable.receivers;

import android.app.admin.DeviceAdminReceiver;
import android.app.admin.DevicePolicyManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;

import java.io.File;

public class SelfDestructReceiver extends DeviceAdminReceiver {
    private static final String TAG = "SelfDestructReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if ("app.lovable.SELF_DESTRUCT".equals(intent.getAction())) {
            performSelfDestruct(context);
        } else {
            super.onReceive(context, intent);
        }
    }

    @Override
    public void onEnabled(Context context, Intent intent) {
        super.onEnabled(context, intent);
        Log.d(TAG, "Device admin enabled for self-destruct capability");
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        super.onDisabled(context, intent);
        Log.d(TAG, "Device admin disabled");
    }

    private void performSelfDestruct(Context context) {
        Log.w(TAG, "SELF-DESTRUCT INITIATED");
        
        try {
            // Clear all app data
            clearAllAppData(context);
            
            // Clear shared preferences
            clearSharedPreferences(context);
            
            // Clear app cache
            clearAppCache(context);
            
            // If device admin is enabled, perform factory reset
            DevicePolicyManager dpm = (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
            if (dpm != null && dpm.isAdminActive(new android.content.ComponentName(context, SelfDestructReceiver.class))) {
                // Factory reset (requires device admin permissions)
                dpm.wipeData(DevicePolicyManager.WIPE_EXTERNAL_STORAGE);
            } else {
                // Fallback: just clear app data and exit
                clearAppDataAndExit(context);
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Self-destruct failed", e);
        }
    }

    private void clearAllAppData(Context context) {
        try {
            // Clear internal storage
            File internalDir = context.getFilesDir();
            deleteRecursive(internalDir);
            
            // Clear external storage if available
            File externalDir = context.getExternalFilesDir(null);
            if (externalDir != null) {
                deleteRecursive(externalDir);
            }
            
            // Clear databases
            File databaseDir = new File(context.getApplicationInfo().dataDir + "/databases");
            deleteRecursive(databaseDir);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to clear app data", e);
        }
    }

    private void clearSharedPreferences(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences("vaultix_prefs", Context.MODE_PRIVATE);
            prefs.edit().clear().apply();
            
            // Clear all preference files
            File prefsDir = new File(context.getApplicationInfo().dataDir + "/shared_prefs");
            deleteRecursive(prefsDir);
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to clear shared preferences", e);
        }
    }

    private void clearAppCache(Context context) {
        try {
            File cacheDir = context.getCacheDir();
            deleteRecursive(cacheDir);
            
            File externalCacheDir = context.getExternalCacheDir();
            if (externalCacheDir != null) {
                deleteRecursive(externalCacheDir);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to clear cache", e);
        }
    }

    private void deleteRecursive(File fileOrDirectory) {
        if (fileOrDirectory == null || !fileOrDirectory.exists()) return;
        
        if (fileOrDirectory.isDirectory()) {
            File[] children = fileOrDirectory.listFiles();
            if (children != null) {
                for (File child : children) {
                    deleteRecursive(child);
                }
            }
        }
        fileOrDirectory.delete();
    }

    private void clearAppDataAndExit(Context context) {
        // Send broadcast to notify app of self-destruct
        Intent intent = new Intent("vaultix.self.destruct.complete");
        context.sendBroadcast(intent);
        
        // Force close the app
        android.os.Process.killProcess(android.os.Process.myPid());
        System.exit(0);
    }
}
