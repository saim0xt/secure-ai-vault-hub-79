
package app.lovable.services;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.ImageFormat;
import android.graphics.Matrix;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CaptureRequest;
import android.media.Image;
import android.media.ImageReader;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Log;
import android.util.Size;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Arrays;
import java.util.Collections;

public class RealIntruderDetectionService {
    
    private static final String TAG = "IntruderDetection";
    private Context context;
    private CameraManager cameraManager;
    private CameraDevice cameraDevice;
    private CameraCaptureSession captureSession;
    private ImageReader imageReader;
    private Handler backgroundHandler;
    private HandlerThread backgroundThread;
    private boolean monitoring = false;
    private String frontCameraId;
    
    public RealIntruderDetectionService(Context context) {
        this.context = context;
        this.cameraManager = (CameraManager) context.getSystemService(Context.CAMERA_SERVICE);
        findFrontCamera();
    }
    
    private void findFrontCamera() {
        try {
            String[] cameraIds = cameraManager.getCameraIdList();
            for (String cameraId : cameraIds) {
                CameraCharacteristics characteristics = cameraManager.getCameraCharacteristics(cameraId);
                Integer facing = characteristics.get(CameraCharacteristics.LENS_FACING);
                if (facing != null && facing == CameraCharacteristics.LENS_FACING_FRONT) {
                    frontCameraId = cameraId;
                    break;
                }
            }
        } catch (CameraAccessException e) {
            Log.e(TAG, "Failed to find front camera", e);
        }
    }
    
    public void startMonitoring() {
        if (!monitoring && frontCameraId != null) {
            monitoring = true;
            startBackgroundThread();
            setupCamera();
            Log.d(TAG, "Intruder detection monitoring started");
        }
    }
    
    public void stopMonitoring() {
        if (monitoring) {
            monitoring = false;
            closeCamera();
            stopBackgroundThread();
            Log.d(TAG, "Intruder detection monitoring stopped");
        }
    }
    
    private void startBackgroundThread() {
        backgroundThread = new HandlerThread("IntruderDetectionBackground");
        backgroundThread.start();
        backgroundHandler = new Handler(backgroundThread.getLooper());
    }
    
    private void stopBackgroundThread() {
        if (backgroundThread != null) {
            backgroundThread.quitSafely();
            try {
                backgroundThread.join();
                backgroundThread = null;
                backgroundHandler = null;
            } catch (InterruptedException e) {
                Log.e(TAG, "Error stopping background thread", e);
            }
        }
    }
    
    private void setupCamera() {
        try {
            setupImageReader();
            openCamera();
        } catch (CameraAccessException e) {
            Log.e(TAG, "Failed to setup camera", e);
        }
    }
    
    private void setupImageReader() {
        imageReader = ImageReader.newInstance(1920, 1080, ImageFormat.JPEG, 1);
        imageReader.setOnImageAvailableListener(imageAvailableListener, backgroundHandler);
    }
    
    private void openCamera() throws CameraAccessException {
        try {
            cameraManager.openCamera(frontCameraId, cameraStateCallback, backgroundHandler);
        } catch (SecurityException e) {
            Log.e(TAG, "Camera permission not granted", e);
        }
    }
    
    private final CameraDevice.StateCallback cameraStateCallback = new CameraDevice.StateCallback() {
        @Override
        public void onOpened(CameraDevice camera) {
            cameraDevice = camera;
            createCaptureSession();
        }
        
        @Override
        public void onDisconnected(CameraDevice camera) {
            closeCamera();
        }
        
        @Override
        public void onError(CameraDevice camera, int error) {
            Log.e(TAG, "Camera error: " + error);
            closeCamera();
        }
    };
    
    private void createCaptureSession() {
        try {
            cameraDevice.createCaptureSession(
                Arrays.asList(imageReader.getSurface()),
                captureSessionCallback,
                backgroundHandler
            );
        } catch (CameraAccessException e) {
            Log.e(TAG, "Failed to create capture session", e);
        }
    }
    
    private final CameraCaptureSession.StateCallback captureSessionCallback = 
        new CameraCaptureSession.StateCallback() {
            @Override
            public void onConfigured(CameraCaptureSession session) {
                captureSession = session;
                Log.d(TAG, "Camera capture session configured");
            }
            
            @Override
            public void onConfigureFailed(CameraCaptureSession session) {
                Log.e(TAG, "Failed to configure capture session");
            }
        };
    
    public String captureIntruderPhoto() {
        if (captureSession == null || !monitoring) {
            Log.w(TAG, "Cannot capture photo - session not ready");
            return null;
        }
        
        try {
            CaptureRequest.Builder captureBuilder = cameraDevice.createCaptureRequest(CameraDevice.TEMPLATE_STILL_CAPTURE);
            captureBuilder.addTarget(imageReader.getSurface());
            captureBuilder.set(CaptureRequest.CONTROL_MODE, CaptureRequest.CONTROL_MODE_AUTO);
            captureBuilder.set(CaptureRequest.JPEG_ORIENTATION, 270); // Adjust for front camera
            
            captureSession.capture(captureBuilder.build(), null, backgroundHandler);
            
            String photoPath = getIntruderPhotoPath();
            Log.d(TAG, "Intruder photo capture initiated: " + photoPath);
            return photoPath;
        } catch (CameraAccessException e) {
            Log.e(TAG, "Failed to capture intruder photo", e);
            return null;
        }
    }
    
    private final ImageReader.OnImageAvailableListener imageAvailableListener = 
        new ImageReader.OnImageAvailableListener() {
            @Override
            public void onImageAvailable(ImageReader reader) {
                Image image = reader.acquireLatestImage();
                if (image != null) {
                    saveIntruderPhoto(image);
                    image.close();
                }
            }
        };
    
    private void saveIntruderPhoto(Image image) {
        try {
            ByteBuffer buffer = image.getPlanes()[0].getBuffer();
            byte[] bytes = new byte[buffer.remaining()];
            buffer.get(bytes);
            
            // Create directory if it doesn't exist
            File photosDir = new File(context.getFilesDir(), "vaultix_security/intruder_photos");
            if (!photosDir.exists()) {
                photosDir.mkdirs();
            }
            
            File photoFile = new File(photosDir, "intruder_" + System.currentTimeMillis() + ".jpg");
            
            FileOutputStream output = new FileOutputStream(photoFile);
            output.write(bytes);
            output.close();
            
            Log.d(TAG, "Intruder photo saved: " + photoFile.getAbsolutePath());
        } catch (IOException e) {
            Log.e(TAG, "Failed to save intruder photo", e);
        }
    }
    
    private String getIntruderPhotoPath() {
        File photosDir = new File(context.getFilesDir(), "vaultix_security/intruder_photos");
        return new File(photosDir, "intruder_" + System.currentTimeMillis() + ".jpg").getAbsolutePath();
    }
    
    public boolean isMonitoring() {
        return monitoring;
    }
    
    private void closeCamera() {
        if (captureSession != null) {
            captureSession.close();
            captureSession = null;
        }
        
        if (cameraDevice != null) {
            cameraDevice.close();
            cameraDevice = null;
        }
        
        if (imageReader != null) {
            imageReader.close();
            imageReader = null;
        }
    }
}
