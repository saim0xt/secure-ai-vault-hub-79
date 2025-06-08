
package app.lovable.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.wifi.WifiManager;
import android.util.Log;

public class NetworkChangeReceiver extends BroadcastReceiver {
    private static final String TAG = "NetworkChangeReceiver";
    
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        
        if (ConnectivityManager.CONNECTIVITY_ACTION.equals(action) ||
            WifiManager.WIFI_STATE_CHANGED_ACTION.equals(action)) {
            
            Log.d(TAG, "Network state changed: " + action);
            
            ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
            
            boolean isConnected = activeNetwork != null && activeNetwork.isConnectedOrConnecting();
            String networkType = "none";
            
            if (isConnected) {
                if (activeNetwork.getType() == ConnectivityManager.TYPE_WIFI) {
                    networkType = "wifi";
                } else if (activeNetwork.getType() == ConnectivityManager.TYPE_MOBILE) {
                    networkType = "mobile";
                }
            }
            
            // Send network change event to app
            Intent networkIntent = new Intent("vaultix.network.changed");
            networkIntent.putExtra("connected", isConnected);
            networkIntent.putExtra("type", networkType);
            networkIntent.putExtra("timestamp", System.currentTimeMillis());
            context.sendBroadcast(networkIntent);
            
            Log.d(TAG, "Network status: " + (isConnected ? "connected" : "disconnected") + " (" + networkType + ")");
        }
    }
}
