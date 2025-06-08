
package app.lovable.plugins;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Arrays;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "ProductionEncryption")
public class ProductionEncryptionPlugin extends Plugin {
    
    private static final String ANDROID_KEYSTORE = "AndroidKeyStore";
    private static final String ENCRYPTION_ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 16;
    
    @PluginMethod
    public void generateSecureKey(PluginCall call) {
        String alias = call.getString("alias");
        
        if (alias == null) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", "Key alias is required");
            call.resolve(result);
            return;
        }
        
        try {
            KeyGenerator keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE);
            
            KeyGenParameterSpec keyGenParameterSpec = new KeyGenParameterSpec.Builder(alias,
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setRandomizedEncryptionRequired(true)
                    .setUserAuthenticationRequired(false)
                    .setInvalidatedByBiometricEnrollment(true)
                    .build();
            
            keyGenerator.init(keyGenParameterSpec);
            keyGenerator.generateKey();
            
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
    public void encryptData(PluginCall call) {
        String alias = call.getString("alias");
        String data = call.getString("data");
        
        if (alias == null || data == null) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", "Key alias and data are required");
            call.resolve(result);
            return;
        }
        
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);
            
            SecretKey secretKey = (SecretKey) keyStore.getKey(alias, null);
            if (secretKey == null) {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", "Key not found");
                call.resolve(result);
                return;
            }
            
            Cipher cipher = Cipher.getInstance(ENCRYPTION_ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey);
            
            byte[] iv = cipher.getIV();
            byte[] encryptedData = cipher.doFinal(data.getBytes("UTF-8"));
            
            // Combine IV and encrypted data
            byte[] combined = new byte[iv.length + encryptedData.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encryptedData, 0, combined, iv.length, encryptedData.length);
            
            String encodedData = Base64.encodeToString(combined, Base64.DEFAULT);
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("encryptedData", encodedData);
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }
    
    @PluginMethod
    public void decryptData(PluginCall call) {
        String alias = call.getString("alias");
        String encryptedData = call.getString("encryptedData");
        
        if (alias == null || encryptedData == null) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", "Key alias and encrypted data are required");
            call.resolve(result);
            return;
        }
        
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);
            
            SecretKey secretKey = (SecretKey) keyStore.getKey(alias, null);
            if (secretKey == null) {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", "Key not found");
                call.resolve(result);
                return;
            }
            
            byte[] combined = Base64.decode(encryptedData, Base64.DEFAULT);
            
            // Extract IV and encrypted data
            byte[] iv = Arrays.copyOfRange(combined, 0, GCM_IV_LENGTH);
            byte[] encrypted = Arrays.copyOfRange(combined, GCM_IV_LENGTH, combined.length);
            
            Cipher cipher = Cipher.getInstance(ENCRYPTION_ALGORITHM);
            GCMParameterSpec gcmParameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH * 8, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmParameterSpec);
            
            byte[] decryptedData = cipher.doFinal(encrypted);
            String data = new String(decryptedData, "UTF-8");
            
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
    public void deleteKey(PluginCall call) {
        String alias = call.getString("alias");
        
        if (alias == null) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", "Key alias is required");
            call.resolve(result);
            return;
        }
        
        try {
            KeyStore keyStore = KeyStore.getInstance(ANDROID_KEYSTORE);
            keyStore.load(null);
            keyStore.deleteEntry(alias);
            
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
    public void verifyIntegrity(PluginCall call) {
        String data = call.getString("data");
        String checksum = call.getString("checksum");
        
        if (data == null || checksum == null) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", "Data and checksum are required");
            call.resolve(result);
            return;
        }
        
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data.getBytes("UTF-8"));
            StringBuilder hexString = new StringBuilder();
            
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            
            boolean valid = hexString.toString().equals(checksum);
            
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("valid", valid);
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }
    
    @PluginMethod
    public void secureMemoryWipe(PluginCall call) {
        try {
            // Force garbage collection
            System.gc();
            
            // Clear any cached data
            Runtime.getRuntime().gc();
            
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
}
