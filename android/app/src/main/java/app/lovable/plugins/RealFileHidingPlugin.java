
package app.lovable.plugins;

import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import app.lovable.services.RealFileHidingService;

@CapacitorPlugin(
    name = "RealFileHiding",
    permissions = {
        @Permission(strings = {Manifest.permission.READ_EXTERNAL_STORAGE}),
        @Permission(strings = {Manifest.permission.WRITE_EXTERNAL_STORAGE})
    }
)
public class RealFileHidingPlugin extends Plugin {
    
    private RealFileHidingService fileHidingService;
    
    @Override
    public void load() {
        fileHidingService = new RealFileHidingService(getContext());
    }
    
    @PluginMethod
    public void hideFile(PluginCall call) {
        String fileName = call.getString("fileName");
        
        if (fileName == null) {
            call.reject("File name is required");
            return;
        }
        
        if (!hasStoragePermissions()) {
            requestStoragePermissions(call);
            return;
        }
        
        boolean success = fileHidingService.hideFile(fileName);
        
        JSObject result = new JSObject();
        result.put("success", success);
        result.put("fileName", fileName);
        
        if (success) {
            call.resolve(result);
        } else {
            call.reject("Failed to hide file: " + fileName);
        }
    }
    
    @PluginMethod
    public void showFile(PluginCall call) {
        String fileName = call.getString("fileName");
        
        if (fileName == null) {
            call.reject("File name is required");
            return;
        }
        
        if (!hasStoragePermissions()) {
            requestStoragePermissions(call);
            return;
        }
        
        boolean success = fileHidingService.showFile(fileName);
        
        JSObject result = new JSObject();
        result.put("success", success);
        result.put("fileName", fileName);
        
        if (success) {
            call.resolve(result);
        } else {
            call.reject("Failed to show file: " + fileName);
        }
    }
    
    @PluginMethod
    public void isFileHidden(PluginCall call) {
        String fileName = call.getString("fileName");
        
        if (fileName == null) {
            call.reject("File name is required");
            return;
        }
        
        boolean isHidden = fileHidingService.isFileHidden(fileName);
        
        JSObject result = new JSObject();
        result.put("isHidden", isHidden);
        result.put("fileName", fileName);
        
        call.resolve(result);
    }
    
    @PluginMethod
    public void getHiddenFiles(PluginCall call) {
        String[] hiddenFiles = fileHidingService.getHiddenFiles();
        
        JSArray filesArray = new JSArray();
        if (hiddenFiles != null) {
            for (String file : hiddenFiles) {
                filesArray.put(file);
            }
        }
        
        JSObject result = new JSObject();
        result.put("files", filesArray);
        
        call.resolve(result);
    }
    
    @PluginMethod
    public void getVisibleFiles(PluginCall call) {
        String[] visibleFiles = fileHidingService.getVisibleFiles();
        
        JSArray filesArray = new JSArray();
        if (visibleFiles != null) {
            for (String file : visibleFiles) {
                filesArray.put(file);
            }
        }
        
        JSObject result = new JSObject();
        result.put("files", filesArray);
        
        call.resolve(result);
    }
    
    private boolean hasStoragePermissions() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_EXTERNAL_STORAGE) 
               == PackageManager.PERMISSION_GRANTED &&
               ContextCompat.checkSelfPermission(getContext(), Manifest.permission.WRITE_EXTERNAL_STORAGE) 
               == PackageManager.PERMISSION_GRANTED;
    }
    
    private void requestStoragePermissions(PluginCall call) {
        requestPermissionForAlias("storage", call, "storagePermsCallback");
    }
}
