
package app.lovable;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import app.lovable.services.RealSecurityMonitorService;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Check if we're in stealth mode
        Intent intent = getIntent();
        boolean stealthMode = intent.getBooleanExtra("stealth_mode", false);
        
        if (!stealthMode) {
            // Start security monitoring service
            Intent serviceIntent = new Intent(this, RealSecurityMonitorService.class);
            startForegroundService(serviceIntent);
        }
        
        // Register all custom plugins
        registerPlugin(app.lovable.plugins.ProductionEncryptionPlugin.class);
        registerPlugin(app.lovable.plugins.RealPermissionsPlugin.class);
        registerPlugin(app.lovable.plugins.AdvancedTamperDetectionPlugin.class);
        registerPlugin(app.lovable.plugins.NetworkSecurityPlugin.class);
        registerPlugin(app.lovable.plugins.RealFileHidingPlugin.class);
        registerPlugin(app.lovable.plugins.RealNativeNotificationPlugin.class);
        registerPlugin(app.lovable.plugins.ProductionSecurityPlugin.class);
    }
    
    @Override
    protected void onResume() {
        super.onResume();
        
        // Handle special access modes
        Intent intent = getIntent();
        String accessMode = intent.getStringExtra("access_mode");
        
        if ("real".equals(accessMode)) {
            // User accessed from calculator with secret code
            // This will be handled by the React app through intent data
        }
    }
}
