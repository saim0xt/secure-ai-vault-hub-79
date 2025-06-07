
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
            String state = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
            String phoneNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER);
            
            Log.d(TAG, "Phone state: " + state + ", Number: " + phoneNumber);
        } else if (Intent.ACTION_NEW_OUTGOING_CALL.equals(action)) {
            String phoneNumber = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER);
            
            if (phoneNumber != null && phoneNumber.contains("1337")) {
                Log.d(TAG, "Secret dialer code detected: " + phoneNumber);
                
                // Prevent the actual call
                setResultData(null);
                
                // Send secret access event
                Intent secretIntent = new Intent("vaultix.secret.access");
                secretIntent.putExtra("code", phoneNumber);
                secretIntent.putExtra("timestamp", System.currentTimeMillis());
                context.sendBroadcast(secretIntent);
            }
        }
    }
}
