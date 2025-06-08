
package app.lovable.services;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioManager;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class RealVolumeKeyService {
    
    private static final String TAG = "VolumeKeyService";
    private static final long SEQUENCE_TIMEOUT = 3000; // 3 seconds
    
    private Context context;
    private VolumeKeyReceiver volumeKeyReceiver;
    private List<String> currentSequence = new ArrayList<>();
    private Handler mainHandler = new Handler(Looper.getMainLooper());
    private ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor();
    private VolumeKeyListener listener;
    private boolean monitoring = false;
    
    // Predefined patterns
    private static final String[] EMERGENCY_LOCK_PATTERN = {"up", "up", "down", "down"};
    private static final String[] PANIC_MODE_PATTERN = {"down", "down", "down", "up", "up"};
    private static final String[] FAKE_VAULT_PATTERN = {"up", "down", "up", "down", "up"};
    private static final String[] QUICK_UNLOCK_PATTERN = {"up", "up", "up"};
    
    public interface VolumeKeyListener {
        void onEmergencyLock();
        void onPanicMode();
        void onFakeVaultToggle();
        void onQuickUnlock();
        void onPatternDetected(String pattern);
    }
    
    public RealVolumeKeyService(Context context) {
        this.context = context;
        this.volumeKeyReceiver = new VolumeKeyReceiver();
    }
    
    public void setVolumeKeyListener(VolumeKeyListener listener) {
        this.listener = listener;
    }
    
    public void startMonitoring() {
        if (!monitoring) {
            monitoring = true;
            
            IntentFilter filter = new IntentFilter();
            filter.addAction("android.media.VOLUME_CHANGED_ACTION");
            filter.addAction("vaultix.volume.up");
            filter.addAction("vaultix.volume.down");
            
            context.registerReceiver(volumeKeyReceiver, filter);
            
            Log.d(TAG, "Volume key monitoring started");
        }
    }
    
    public void stopMonitoring() {
        if (monitoring) {
            monitoring = false;
            
            try {
                context.unregisterReceiver(volumeKeyReceiver);
            } catch (IllegalArgumentException e) {
                Log.w(TAG, "Receiver not registered", e);
            }
            
            currentSequence.clear();
            Log.d(TAG, "Volume key monitoring stopped");
        }
    }
    
    private void addToSequence(String key) {
        if (!monitoring) return;
        
        currentSequence.add(key);
        
        // Limit sequence length
        if (currentSequence.size() > 10) {
            currentSequence.remove(0);
        }
        
        // Check for pattern matches
        checkPatterns();
        
        // Reset sequence after timeout
        executor.schedule(this::resetSequence, SEQUENCE_TIMEOUT, TimeUnit.MILLISECONDS);
        
        Log.d(TAG, "Volume key sequence: " + currentSequence.toString());
    }
    
    private void resetSequence() {
        mainHandler.post(() -> {
            if (currentSequence.size() > 0) {
                Log.d(TAG, "Volume key sequence reset");
                currentSequence.clear();
            }
        });
    }
    
    private void checkPatterns() {
        // Check emergency lock pattern
        if (matchesPattern(EMERGENCY_LOCK_PATTERN)) {
            triggerAction("emergency_lock");
            return;
        }
        
        // Check panic mode pattern
        if (matchesPattern(PANIC_MODE_PATTERN)) {
            triggerAction("panic_mode");
            return;
        }
        
        // Check fake vault pattern
        if (matchesPattern(FAKE_VAULT_PATTERN)) {
            triggerAction("fake_vault");
            return;
        }
        
        // Check quick unlock pattern
        if (matchesPattern(QUICK_UNLOCK_PATTERN)) {
            triggerAction("quick_unlock");
            return;
        }
    }
    
    private boolean matchesPattern(String[] pattern) {
        if (currentSequence.size() < pattern.length) {
            return false;
        }
        
        int startIndex = currentSequence.size() - pattern.length;
        for (int i = 0; i < pattern.length; i++) {
            if (!currentSequence.get(startIndex + i).equals(pattern[i])) {
                return false;
            }
        }
        
        return true;
    }
    
    private void triggerAction(String action) {
        Log.i(TAG, "Volume key action triggered: " + action);
        currentSequence.clear();
        
        if (listener != null) {
            switch (action) {
                case "emergency_lock":
                    listener.onEmergencyLock();
                    break;
                case "panic_mode":
                    listener.onPanicMode();
                    break;
                case "fake_vault":
                    listener.onFakeVaultToggle();
                    break;
                case "quick_unlock":
                    listener.onQuickUnlock();
                    break;
            }
            listener.onPatternDetected(action);
        }
        
        // Send broadcast to notify other components
        Intent intent = new Intent("vaultix.volume.pattern.detected");
        intent.putExtra("pattern", action);
        intent.putExtra("timestamp", System.currentTimeMillis());
        context.sendBroadcast(intent);
    }
    
    public boolean isMonitoring() {
        return monitoring;
    }
    
    private class VolumeKeyReceiver extends BroadcastReceiver {
        private int lastVolume = -1;
        
        @Override
        public void onReceive(Context context, Intent intent) {
            if (!monitoring) return;
            
            String action = intent.getAction();
            
            if ("android.media.VOLUME_CHANGED_ACTION".equals(action)) {
                AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
                int currentVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC);
                
                if (lastVolume != -1) {
                    if (currentVolume > lastVolume) {
                        addToSequence("up");
                    } else if (currentVolume < lastVolume) {
                        addToSequence("down");
                    }
                }
                
                lastVolume = currentVolume;
            } else if ("vaultix.volume.up".equals(action)) {
                addToSequence("up");
            } else if ("vaultix.volume.down".equals(action)) {
                addToSequence("down");
            }
        }
    }
}
