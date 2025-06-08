
package app.lovable;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Register custom plugins
        registerPlugin(app.lovable.plugins.ProductionEncryptionPlugin.class);
        registerPlugin(app.lovable.plugins.RealPermissionsPlugin.class);
        registerPlugin(app.lovable.plugins.AdvancedTamperDetectionPlugin.class);
        registerPlugin(app.lovable.plugins.NetworkSecurityPlugin.class);
    }
}
