
package app.lovable.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class VolumeKeyReceiver extends BroadcastReceiver {
    
    private static final String TAG = "VolumeKeyReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        
        if ("android.media.VOLUME_CHANGED_ACTION".equals(action)) {
            Log.d(TAG, "Volume change detected");
            
            // Forward to volume key service
            Intent volumeIntent = new Intent("vaultix.volume.changed");
            volumeIntent.putExtra("timestamp", System.currentTimeMillis());
            volumeIntent.putExtra("original_action", action);
            context.sendBroadcast(volumeIntent);
        }
    }
}
