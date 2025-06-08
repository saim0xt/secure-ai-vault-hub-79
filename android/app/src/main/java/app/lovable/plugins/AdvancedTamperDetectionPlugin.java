
package app.lovable.plugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import app.lovable.services.RealTamperDetectionService;

@CapacitorPlugin(name = "AdvancedTamperDetection")
public class AdvancedTamperDetectionPlugin extends Plugin {
    
    private RealTamperDetectionService tamperService;
    
    @Override
    public void load() {
        tamperService = new RealTamperDetectionService(getContext());
    }
    
    @PluginMethod
    public void startMonitoring(PluginCall call) {
        tamperService.startMonitoring();
        
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("monitoring", true);
        call.resolve(result);
    }
    
    @PluginMethod
    public void stopMonitoring(PluginCall call) {
        tamperService.stopMonitoring();
        
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("monitoring", false);
        call.resolve(result);
    }
    
    @PluginMethod
    public void detectTampering(PluginCall call) {
        boolean tampered = tamperService.detectTampering();
        JSObject details = tamperService.getTamperDetails();
        
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("tampered", tampered);
        result.put("details", details);
        call.resolve(result);
    }
    
    @PluginMethod
    public void getTamperDetails(PluginCall call) {
        JSObject details = tamperService.getTamperDetails();
        
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("details", details);
        call.resolve(result);
    }
    
    @PluginMethod
    public void isMonitoring(PluginCall call) {
        boolean monitoring = tamperService.isMonitoring();
        
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("monitoring", monitoring);
        call.resolve(result);
    }
}
