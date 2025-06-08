
package app.lovable;

import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import com.getcapacitor.BridgeActivity;

public class CalculatorMainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Set flag to indicate this is calculator (stealth) mode
        getIntent().putExtra("stealth_mode", true);
        getIntent().putExtra("disguise_mode", "calculator");
        
        // Register custom plugins
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
        
        // Check for secret access code
        Intent intent = getIntent();
        String accessCode = intent.getStringExtra("access_code");
        if ("1337".equals(accessCode)) {
            // Switch to real vault mode
            Intent mainIntent = new Intent(this, MainActivity.class);
            mainIntent.putExtra("access_mode", "real");
            mainIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
            startActivity(mainIntent);
            finish();
        }
    }
}
