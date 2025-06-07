
package app.lovable.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.util.Log;

public class VolumeButtonReceiver extends BroadcastReceiver {
    private static final String TAG = "VolumeButtonReceiver";
    private static long lastVolumePress = 0;
    private static int volumePressCount = 0;
    private static final long PATTERN_TIMEOUT = 3000; // 3 seconds

    @Override
    public void onReceive(Context context, Intent intent) {
        if ("android.media.VOLUME_CHANGED_ACTION".equals(intent.getAction())) {
            long currentTime = System.currentTimeMillis();
            
            // Reset count if too much time has passed
            if (currentTime - lastVolumePress > PATTERN_TIMEOUT) {
                volumePressCount = 0;
            }
            
            volumePressCount++;
            lastVolumePress = currentTime;
            
            Log.d(TAG, "Volume key pressed. Count: " + volumePressCount);
            
            // Check for emergency pattern (5 quick presses)
            if (volumePressCount >= 5) {
                Log.w(TAG, "Emergency volume pattern detected!");
                
                Intent emergencyIntent = new Intent("vaultix.emergency.pattern");
                emergencyIntent.putExtra("pattern", "volume_5x");
                emergencyIntent.putExtra("timestamp", currentTime);
                context.sendBroadcast(emergencyIntent);
                
                volumePressCount = 0; // Reset
            }
            
            // Send general volume event
            Intent volumeIntent = new Intent("vaultix.volume.changed");
            volumeIntent.putExtra("count", volumePressCount);
            volumeIntent.putExtra("timestamp", currentTime);
            context.sendBroadcast(volumeIntent);
        }
    }
}
