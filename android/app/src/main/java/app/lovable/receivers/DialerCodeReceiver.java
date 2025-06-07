
package app.lovable.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.telephony.TelephonyManager;
import android.util.Log;

public class DialerCodeReceiver extends BroadcastReceiver {
    private static final String TAG = "DialerCodeReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        
        if (TelephonyManager.ACTION_PHONE_STATE_CHANGED.equals(action)) {
            String state = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
            String phoneNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER);
            
            if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(state) && phoneNumber != null) {
                checkDialerCode(context, phoneNumber);
            }
        } else if (Intent.ACTION_NEW_OUTGOING_CALL.equals(action)) {
            String phoneNumber = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER);
            if (phoneNumber != null) {
                checkDialerCode(context, phoneNumber);
                // Abort the call if it's a dialer code
                if (isDialerCode(phoneNumber)) {
                    setResultData(null);
                }
            }
        }
    }

    private void checkDialerCode(Context context, String phoneNumber) {
        if (isDialerCode(phoneNumber)) {
            Log.d(TAG, "Dialer code detected: " + phoneNumber);
            
            // Send broadcast to JavaScript layer
            Intent dialerIntent = new Intent("vaultix.dialer.code");
            dialerIntent.putExtra("code", phoneNumber);
            dialerIntent.putExtra("timestamp", System.currentTimeMillis());
            context.sendBroadcast(dialerIntent);
        }
    }

    private boolean isDialerCode(String phoneNumber) {
        if (phoneNumber == null) return false;
        
        // Check for known dialer codes
        String[] codes = {
            "*#1337#*",   // Launch real vault
            "*#0000#*",   // Launch fake vault
            "*#9999#*",   // Toggle stealth mode
            "*#666666#*", // Emergency wipe
            "*#2580#*"    // Trigger backup
        };
        
        for (String code : codes) {
            if (phoneNumber.contains(code) || phoneNumber.equals(code)) {
                return true;
            }
        }
        
        return false;
    }
}
