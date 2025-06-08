
package app.lovable.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.util.Log;
import android.view.KeyEvent;

public class VolumeButtonReceiver extends BroadcastReceiver {
    private static final String TAG = "VolumeButtonReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        
        if ("android.media.VOLUME_CHANGED_ACTION".equals(action)) {
            // Get the stream type and volume level
            int streamType = intent.getIntExtra("android.media.EXTRA_VOLUME_STREAM_TYPE", -1);
            int volume = intent.getIntExtra("android.media.EXTRA_VOLUME_STREAM_VALUE", -1);
            int prevVolume = intent.getIntExtra("android.media.EXTRA_PREV_VOLUME_STREAM_VALUE", -1);
            
            Log.d(TAG, "Volume changed - Stream: " + streamType + ", Volume: " + volume + ", Previous: " + prevVolume);
            
            // Determine if volume up or down was pressed
            boolean volumeUp = volume > prevVolume;
            boolean volumeDown = volume < prevVolume;
            
            if (volumeUp || volumeDown) {
                // Send custom broadcast to app
                Intent volumeIntent = new Intent("vaultix.volume.changed");
                volumeIntent.putExtra("direction", volumeUp ? "up" : "down");
                volumeIntent.putExtra("volume", volume);
                volumeIntent.putExtra("streamType", streamType);
                volumeIntent.putExtra("timestamp", System.currentTimeMillis());
                context.sendBroadcast(volumeIntent);
                
                Log.d(TAG, "Volume key detected: " + (volumeUp ? "UP" : "DOWN"));
                
                // Check for special patterns (e.g., rapid presses for emergency)
                checkForEmergencyPattern(context, volumeUp);
            }
        }
    }
    
    private void checkForEmergencyPattern(Context context, boolean volumeUp) {
        // Emergency pattern: 5 rapid volume up presses within 3 seconds
        long currentTime = System.currentTimeMillis();
        String prefKey = "last_volume_press_time";
        String countKey = "volume_press_count";
        
        try {
            android.content.SharedPreferences prefs = context.getSharedPreferences("vaultix_security", Context.MODE_PRIVATE);
            long lastPressTime = prefs.getLong(prefKey, 0);
            int pressCount = prefs.getInt(countKey, 0);
            
            if (currentTime - lastPressTime < 3000) { // Within 3 seconds
                pressCount++;
            } else {
                pressCount = 1; // Reset count
            }
            
            // Save current state
            prefs.edit()
                .putLong(prefKey, currentTime)
                .putInt(countKey, pressCount)
                .apply();
            
            if (pressCount >= 5 && volumeUp) {
                // Emergency pattern detected
                Log.w(TAG, "Emergency volume pattern detected!");
                
                Intent emergencyIntent = new Intent("vaultix.emergency.pattern");
                emergencyIntent.putExtra("type", "volume_sequence");
                emergencyIntent.putExtra("count", pressCount);
                emergencyIntent.putExtra("timestamp", currentTime);
                context.sendBroadcast(emergencyIntent);
                
                // Reset count
                prefs.edit().putInt(countKey, 0).apply();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking emergency pattern", e);
        }
    }
}
