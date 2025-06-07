
package app.lovable;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class CalculatorActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Set flag to indicate this is calculator (stealth) mode
        getIntent().putExtra("stealth_mode", true);
    }
}
