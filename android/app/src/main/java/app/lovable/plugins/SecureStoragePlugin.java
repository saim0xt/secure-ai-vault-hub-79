
package app.lovable.plugins;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import androidx.security.crypto.EncryptedFile;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "SecureStorage")
public class SecureStoragePlugin extends Plugin {
    
    private MasterKey masterKey;
    private static final String KEYSTORE_ALIAS = "VaultixSecureKey";
    
    @Override
    public void load() {
        try {
            masterKey = new MasterKey.Builder(getContext())
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @PluginMethod
    public void storeSecureData(PluginCall call) {
        String key = call.getString("key");
        String data = call.getString("data");
        
        if (key == null || data == null) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", "Key and data are required");
            call.resolve(result);
            return;
        }
        
        try {
            // Use Android's EncryptedSharedPreferences
            android.content.SharedPreferences sharedPreferences = EncryptedSharedPreferences.create(
                "vaultix_secure_prefs",
                masterKey,
                getContext(),
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
            
            sharedPreferences.edit().putString(key, data).apply();
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void getSecureData(PluginCall call) {
        String key = call.getString("key");
        
        if (key == null) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", "Key is required");
            call.resolve(result);
            return;
        }
        
        try {
            android.content.SharedPreferences sharedPreferences = EncryptedSharedPreferences.create(
                "vaultix_secure_prefs",
                masterKey,
                getContext(),
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
            
            String data = sharedPreferences.getString(key, null);
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("data", data);
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void storeSecureFile(PluginCall call) {
        String fileName = call.getString("fileName");
        String fileData = call.getString("fileData");
        
        if (fileName == null || fileData == null) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", "fileName and fileData are required");
            call.resolve(result);
            return;
        }
        
        try {
            File file = new File(getContext().getFilesDir(), "vaultix_secure/" + fileName);
            file.getParentFile().mkdirs();
            
            EncryptedFile encryptedFile = new EncryptedFile.Builder(
                getContext(),
                file,
                masterKey,
                EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB
            ).build();
            
            FileOutputStream outputStream = encryptedFile.openFileOutput();
            outputStream.write(fileData.getBytes(StandardCharsets.UTF_8));
            outputStream.close();
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("filePath", file.getAbsolutePath());
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void getSecureFile(PluginCall call) {
        String fileName = call.getString("fileName");
        
        if (fileName == null) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", "fileName is required");
            call.resolve(result);
            return;
        }
        
        try {
            File file = new File(getContext().getFilesDir(), "vaultix_secure/" + fileName);
            
            if (!file.exists()) {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", "File not found");
                call.resolve(result);
                return;
            }
            
            EncryptedFile encryptedFile = new EncryptedFile.Builder(
                getContext(),
                file,
                masterKey,
                EncryptedFile.FileEncryptionScheme.AES256_GCM_HKDF_4KB
            ).build();
            
            FileInputStream inputStream = encryptedFile.openFileInput();
            byte[] fileBytes = new byte[inputStream.available()];
            inputStream.read(fileBytes);
            inputStream.close();
            
            String fileData = new String(fileBytes, StandardCharsets.UTF_8);
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("fileData", fileData);
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void deleteSecureFile(PluginCall call) {
        String fileName = call.getString("fileName");
        
        if (fileName == null) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", "fileName is required");
            call.resolve(result);
            return;
        }
        
        try {
            File file = new File(getContext().getFilesDir(), "vaultix_secure/" + fileName);
            boolean deleted = file.delete();
            
            JSObject result = new JSObject();
            result.put("success", deleted);
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void clearAllSecureData(PluginCall call) {
        try {
            // Clear encrypted preferences
            android.content.SharedPreferences sharedPreferences = EncryptedSharedPreferences.create(
                "vaultix_secure_prefs",
                masterKey,
                getContext(),
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
            
            sharedPreferences.edit().clear().apply();
            
            // Delete all secure files
            File secureDir = new File(getContext().getFilesDir(), "vaultix_secure");
            if (secureDir.exists()) {
                deleteRecursive(secureDir);
            }
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }
    
    private void deleteRecursive(File fileOrDirectory) {
        if (fileOrDirectory.isDirectory()) {
            for (File child : fileOrDirectory.listFiles()) {
                deleteRecursive(child);
            }
        }
        fileOrDirectory.delete();
    }
}
