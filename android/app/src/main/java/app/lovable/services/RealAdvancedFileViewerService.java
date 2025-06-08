
package app.lovable.services;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.pdf.PdfRenderer;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.webkit.MimeTypeMap;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class RealAdvancedFileViewerService {
    private Context context;
    
    public RealAdvancedFileViewerService(Context context) {
        this.context = context;
    }
    
    public Map<String, Object> analyzeFile(String filePath) {
        Map<String, Object> analysis = new HashMap<>();
        File file = new File(filePath);
        
        if (!file.exists()) {
            analysis.put("error", "File not found");
            return analysis;
        }
        
        analysis.put("name", file.getName());
        analysis.put("size", file.length());
        analysis.put("lastModified", file.lastModified());
        analysis.put("canRead", file.canRead());
        analysis.put("canWrite", file.canWrite());
        
        String mimeType = getMimeType(filePath);
        analysis.put("mimeType", mimeType);
        analysis.put("extension", getFileExtension(file.getName()));
        
        // Add specific analysis based on file type
        if (mimeType != null) {
            if (mimeType.startsWith("image/")) {
                analysis.putAll(analyzeImage(filePath));
            } else if (mimeType.startsWith("video/")) {
                analysis.putAll(analyzeVideo(filePath));
            } else if (mimeType.startsWith("audio/")) {
                analysis.putAll(analyzeAudio(filePath));
            } else if (mimeType.equals("application/pdf")) {
                analysis.putAll(analyzePdf(filePath));
            }
        }
        
        return analysis;
    }
    
    private Map<String, Object> analyzeImage(String filePath) {
        Map<String, Object> imageInfo = new HashMap<>();
        
        try {
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inJustDecodeBounds = true;
            BitmapFactory.decodeFile(filePath, options);
            
            imageInfo.put("width", options.outWidth);
            imageInfo.put("height", options.outHeight);
            imageInfo.put("colorType", options.inPreferredConfig);
        } catch (Exception e) {
            imageInfo.put("error", "Failed to analyze image: " + e.getMessage());
        }
        
        return imageInfo;
    }
    
    private Map<String, Object> analyzeVideo(String filePath) {
        Map<String, Object> videoInfo = new HashMap<>();
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        
        try {
            retriever.setDataSource(filePath);
            
            String duration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
            String width = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH);
            String height = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT);
            String bitrate = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_BITRATE);
            
            videoInfo.put("duration", duration != null ? Long.parseLong(duration) : 0);
            videoInfo.put("width", width != null ? Integer.parseInt(width) : 0);
            videoInfo.put("height", height != null ? Integer.parseInt(height) : 0);
            videoInfo.put("bitrate", bitrate != null ? Integer.parseInt(bitrate) : 0);
        } catch (Exception e) {
            videoInfo.put("error", "Failed to analyze video: " + e.getMessage());
        } finally {
            try {
                retriever.release();
            } catch (Exception e) {
                // Ignore
            }
        }
        
        return videoInfo;
    }
    
    private Map<String, Object> analyzeAudio(String filePath) {
        Map<String, Object> audioInfo = new HashMap<>();
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        
        try {
            retriever.setDataSource(filePath);
            
            String duration = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
            String bitrate = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_BITRATE);
            String artist = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST);
            String title = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE);
            
            audioInfo.put("duration", duration != null ? Long.parseLong(duration) : 0);
            audioInfo.put("bitrate", bitrate != null ? Integer.parseInt(bitrate) : 0);
            audioInfo.put("artist", artist);
            audioInfo.put("title", title);
        } catch (Exception e) {
            audioInfo.put("error", "Failed to analyze audio: " + e.getMessage());
        } finally {
            try {
                retriever.release();
            } catch (Exception e) {
                // Ignore
            }
        }
        
        return audioInfo;
    }
    
    private Map<String, Object> analyzePdf(String filePath) {
        Map<String, Object> pdfInfo = new HashMap<>();
        
        try {
            ParcelFileDescriptor fd = ParcelFileDescriptor.open(new File(filePath), ParcelFileDescriptor.MODE_READ_ONLY);
            PdfRenderer renderer = new PdfRenderer(fd);
            
            pdfInfo.put("pageCount", renderer.getPageCount());
            
            renderer.close();
            fd.close();
        } catch (Exception e) {
            pdfInfo.put("error", "Failed to analyze PDF: " + e.getMessage());
        }
        
        return pdfInfo;
    }
    
    public String generateThumbnail(String filePath, int width, int height) {
        String mimeType = getMimeType(filePath);
        
        if (mimeType != null && mimeType.startsWith("image/")) {
            return generateImageThumbnail(filePath, width, height);
        } else if (mimeType != null && mimeType.startsWith("video/")) {
            return generateVideoThumbnail(filePath, width, height);
        } else if (mimeType != null && mimeType.equals("application/pdf")) {
            return generatePdfThumbnail(filePath, width, height);
        }
        
        return null;
    }
    
    private String generateImageThumbnail(String filePath, int width, int height) {
        try {
            Bitmap originalBitmap = BitmapFactory.decodeFile(filePath);
            if (originalBitmap == null) return null;
            
            Bitmap thumbnail = Bitmap.createScaledBitmap(originalBitmap, width, height, true);
            
            String thumbnailPath = context.getCacheDir() + "/thumb_" + System.currentTimeMillis() + ".jpg";
            FileOutputStream out = new FileOutputStream(thumbnailPath);
            thumbnail.compress(Bitmap.CompressFormat.JPEG, 80, out);
            out.close();
            
            originalBitmap.recycle();
            thumbnail.recycle();
            
            return thumbnailPath;
        } catch (Exception e) {
            return null;
        }
    }
    
    private String generateVideoThumbnail(String filePath, int width, int height) {
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        
        try {
            retriever.setDataSource(filePath);
            Bitmap frame = retriever.getFrameAtTime(1000000); // 1 second
            
            if (frame != null) {
                Bitmap thumbnail = Bitmap.createScaledBitmap(frame, width, height, true);
                
                String thumbnailPath = context.getCacheDir() + "/thumb_" + System.currentTimeMillis() + ".jpg";
                FileOutputStream out = new FileOutputStream(thumbnailPath);
                thumbnail.compress(Bitmap.CompressFormat.JPEG, 80, out);
                out.close();
                
                frame.recycle();
                thumbnail.recycle();
                
                return thumbnailPath;
            }
        } catch (Exception e) {
            // Ignore
        } finally {
            try {
                retriever.release();
            } catch (Exception e) {
                // Ignore
            }
        }
        
        return null;
    }
    
    private String generatePdfThumbnail(String filePath, int width, int height) {
        try {
            ParcelFileDescriptor fd = ParcelFileDescriptor.open(new File(filePath), ParcelFileDescriptor.MODE_READ_ONLY);
            PdfRenderer renderer = new PdfRenderer(fd);
            
            if (renderer.getPageCount() > 0) {
                PdfRenderer.Page page = renderer.openPage(0);
                
                Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
                page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
                
                String thumbnailPath = context.getCacheDir() + "/thumb_" + System.currentTimeMillis() + ".jpg";
                FileOutputStream out = new FileOutputStream(thumbnailPath);
                bitmap.compress(Bitmap.CompressFormat.JPEG, 80, out);
                out.close();
                
                page.close();
                renderer.close();
                fd.close();
                bitmap.recycle();
                
                return thumbnailPath;
            }
            
            renderer.close();
            fd.close();
        } catch (Exception e) {
            // Ignore
        }
        
        return null;
    }
    
    private String getMimeType(String filePath) {
        String extension = getFileExtension(new File(filePath).getName());
        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
    }
    
    private String getFileExtension(String fileName) {
        int lastDot = fileName.lastIndexOf('.');
        return lastDot != -1 ? fileName.substring(lastDot + 1).toLowerCase() : "";
    }
}
