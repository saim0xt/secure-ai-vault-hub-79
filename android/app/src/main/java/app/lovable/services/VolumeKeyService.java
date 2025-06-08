
package app.lovable.services;

import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioManager;
import android.os.IBinder;

public class VolumeKeyService extends Service {
    
    private VolumeKeyReceiver volumeKeyReceiver;
    
    @Override
    public void onCreate() {
        super.onCreate();
        volumeKeyReceiver = new VolumeKeyReceiver();
        IntentFilter filter = new IntentFilter();
        filter.addAction("android.media.VOLUME_CHANGED_ACTION");
        registerReceiver(volumeKeyReceiver, filter);
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        if (volumeKeyReceiver != null) {
            unregisterReceiver(volumeKeyReceiver);
        }
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    private class VolumeKeyReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            if ("android.media.VOLUME_CHANGED_ACTION".equals(intent.getAction())) {
                // Handle volume key press
                // Send event to JavaScript
                Intent jsEvent = new Intent("vaultix.volume.changed");
                jsEvent.putExtra("timestamp", System.currentTimeMillis());
                context.sendBroadcast(jsEvent);
            }
        }
    }
}
