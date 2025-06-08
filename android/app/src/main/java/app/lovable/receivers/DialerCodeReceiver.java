
package app.lovable.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.telephony.TelephonyManager;
import android.util.Log;

public class DialerCodeReceiver extends BroadcastReceiver {
    private static final String TAG = "DialerCodeReceiver";
    private static final String SECRET_CODE = "*#1337#*";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        
        if (TelephonyManager.ACTION_PHONE_STATE_CHANGED.equals(action)) {
            // Handle phone state changes
            String state = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
            String number = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER);
            
            Log.d(TAG, "Phone state changed: " + state + ", Number: " + number);
            
        } else if ("android.intent.action.NEW_OUTGOING_CALL".equals(action)) {
            // Handle outgoing calls
            String number = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER);
            
            if (number != null && number.contains("1337")) {
                Log.d(TAG, "Secret dialer code detected: " + number);
                
                // Send secret access broadcast
                Intent secretIntent = new Intent("vaultix.secret.access");
                secretIntent.putExtra("code", number);
                secretIntent.putExtra("timestamp", System.currentTimeMillis());
                context.sendBroadcast(secretIntent);
                
                // Cancel the call
                setResultData(null);
            }
        }
    }
}
