
package app.lovable.services;

import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioManager;
import android.os.IBinder;
import android.util.Log;
import android.view.KeyEvent;

import app.lovable.receivers.VolumeButtonReceiver;

public class VolumeKeyService extends Service {
    private static final String TAG = "VolumeKeyService";
    
    private VolumeButtonReceiver volumeReceiver;
    private AudioManager audioManager;
    private boolean isCaptureEnabled = false;
    
    @Override
    public void onCreate() {
        super.onCreate();
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        volumeReceiver = new VolumeButtonReceiver();
        Log.d(TAG, "VolumeKeyService created");
    }
    
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        
        if ("ENABLE_CAPTURE".equals(action)) {
            enableVolumeKeyCapture();
        } else if ("DISABLE_CAPTURE".equals(action)) {
            disableVolumeKeyCapture();
        }
        
        return START_STICKY;
    }
    
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        disableVolumeKeyCapture();
        Log.d(TAG, "VolumeKeyService destroyed");
    }
    
    private void enableVolumeKeyCapture() {
        if (isCaptureEnabled) return;
        
        try {
            // Register volume change receiver
            IntentFilter filter = new IntentFilter();
            filter.addAction("android.media.VOLUME_CHANGED_ACTION");
            filter.setPriority(IntentFilter.SYSTEM_HIGH_PRIORITY);
            
            registerReceiver(volumeReceiver, filter);
            isCaptureEnabled = true;
            
            Log.d(TAG, "Volume key capture enabled");
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to enable volume key capture", e);
        }
    }
    
    private void disableVolumeKeyCapture() {
        if (!isCaptureEnabled) return;
        
        try {
            if (volumeReceiver != null) {
                unregisterReceiver(volumeReceiver);
            }
            isCaptureEnabled = false;
            
            Log.d(TAG, "Volume key capture disabled");
            
        } catch (Exception e) {
            Log.e(TAG, "Failed to disable volume key capture", e);
        }
    }
}
