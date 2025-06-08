
package app.lovable.services;

import android.content.Context;
import android.os.Environment;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.channels.FileChannel;

public class RealFileHidingService {
    private Context context;
    private static final String HIDDEN_DIR = ".vaultix_hidden";
    private static final String VISIBLE_DIR = "vaultix_visible";
    
    public RealFileHidingService(Context context) {
        this.context = context;
        initializeDirectories();
    }
    
    private void initializeDirectories() {
        File hiddenDir = new File(context.getFilesDir(), HIDDEN_DIR);
        File visibleDir = new File(context.getExternalFilesDir(null), VISIBLE_DIR);
        
        if (!hiddenDir.exists()) {
            hiddenDir.mkdirs();
        }
        if (!visibleDir.exists()) {
            visibleDir.mkdirs();
        }
    }
    
    public boolean hideFile(String fileName) {
        try {
            File visibleFile = new File(context.getExternalFilesDir(null), VISIBLE_DIR + "/" + fileName);
            File hiddenFile = new File(context.getFilesDir(), HIDDEN_DIR + "/" + fileName);
            
            if (visibleFile.exists()) {
                copyFile(visibleFile, hiddenFile);
                return visibleFile.delete();
            }
            return false;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
    
    public boolean showFile(String fileName) {
        try {
            File hiddenFile = new File(context.getFilesDir(), HIDDEN_DIR + "/" + fileName);
            File visibleFile = new File(context.getExternalFilesDir(null), VISIBLE_DIR + "/" + fileName);
            
            if (hiddenFile.exists()) {
                copyFile(hiddenFile, visibleFile);
                return hiddenFile.delete();
            }
            return false;
        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }
    
    public boolean isFileHidden(String fileName) {
        File hiddenFile = new File(context.getFilesDir(), HIDDEN_DIR + "/" + fileName);
        return hiddenFile.exists();
    }
    
    private void copyFile(File source, File destination) throws IOException {
        if (!destination.getParentFile().exists()) {
            destination.getParentFile().mkdirs();
        }
        
        FileChannel sourceChannel = null;
        FileChannel destChannel = null;
        
        try {
            sourceChannel = new FileInputStream(source).getChannel();
            destChannel = new FileOutputStream(destination).getChannel();
            destChannel.transferFrom(sourceChannel, 0, sourceChannel.size());
        } finally {
            if (sourceChannel != null) sourceChannel.close();
            if (destChannel != null) destChannel.close();
        }
    }
    
    public String[] getHiddenFiles() {
        File hiddenDir = new File(context.getFilesDir(), HIDDEN_DIR);
        return hiddenDir.list();
    }
    
    public String[] getVisibleFiles() {
        File visibleDir = new File(context.getExternalFilesDir(null), VISIBLE_DIR);
        return visibleDir.list();
    }
}
