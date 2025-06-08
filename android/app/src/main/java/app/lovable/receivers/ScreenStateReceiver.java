
package app.lovable.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class ScreenStateReceiver extends BroadcastReceiver {
    private static final String TAG = "ScreenStateReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        
        if (Intent.ACTION_SCREEN_OFF.equals(action)) {
            Log.d(TAG, "Screen turned OFF");
            sendScreenStateEvent(context, "screen_off");
            
        } else if (Intent.ACTION_SCREEN_ON.equals(action)) {
            Log.d(TAG, "Screen turned ON");
            sendScreenStateEvent(context, "screen_on");
            
        } else if (Intent.ACTION_USER_PRESENT.equals(action)) {
            Log.d(TAG, "User present (unlocked)");
            sendScreenStateEvent(context, "user_present");
        }
    }
    
    private void sendScreenStateEvent(Context context, String state) {
        Intent intent = new Intent("vaultix.screen.state");
        intent.putExtra("state", state);
        intent.putExtra("timestamp", System.currentTimeMillis());
        context.sendBroadcast(intent);
    }
}
