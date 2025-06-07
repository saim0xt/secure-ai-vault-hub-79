
package app.lovable.receivers;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.util.Log;

public class NetworkChangeReceiver extends BroadcastReceiver {
    private static final String TAG = "NetworkChangeReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (ConnectivityManager.CONNECTIVITY_ACTION.equals(intent.getAction())) {
            ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
            
            boolean isConnected = activeNetwork != null && activeNetwork.isConnectedOrConnecting();
            
            Log.d(TAG, "Network state changed: " + (isConnected ? "Connected" : "Disconnected"));
            
            // Send network status to JavaScript layer
            Intent networkIntent = new Intent("vaultix.network.changed");
            networkIntent.putExtra("connected", isConnected);
            if (isConnected && activeNetwork != null) {
                networkIntent.putExtra("type", activeNetwork.getTypeName());
            }
            context.sendBroadcast(networkIntent);
        }
    }
}
