
package app.lovable.services;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.ImageFormat;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CaptureRequest;
import android.media.Image;
import android.media.ImageReader;
import android.os.Environment;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Size;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.util.Arrays;

public class IntruderDetectionService {
    
    private Context context;
    private CameraManager cameraManager;
    private CameraDevice cameraDevice;
    private CameraCaptureSession captureSession;
    private ImageReader imageReader;
    private Handler backgroundHandler;
    private HandlerThread backgroundThread;
    private boolean monitoring = false;
    
    public IntruderDetectionService(Context context) {
        this.context = context;
        this.cameraManager = (CameraManager) context.getSystemService(Context.CAMERA_SERVICE);
    }
    
    public void startMonitoring() {
        if (!monitoring) {
            monitoring = true;
            startBackgroundThread();
            setupCamera();
        }
    }
    
    public void stopMonitoring() {
        if (monitoring) {
            monitoring = false;
            closeCamera();
            stopBackgroundThread();
        }
    }
    
    private void startBackgroundThread() {
        backgroundThread = new HandlerThread("IntruderDetection");
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
                e.printStackTrace();
            }
        }
    }
    
    private void setupCamera() {
        try {
            String[] cameraIds = cameraManager.getCameraIdList();
            for (String cameraId : cameraIds) {
                CameraCharacteristics characteristics = cameraManager.getCameraCharacteristics(cameraId);
                Integer facing = characteristics.get(CameraCharacteristics.LENS_FACING);
                
                // Use front-facing camera for intruder detection
                if (facing != null && facing == CameraCharacteristics.LENS_FACING_FRONT) {
                    setupImageReader();
                    openCamera(cameraId);
                    break;
                }
            }
        } catch (CameraAccessException e) {
            e.printStackTrace();
        }
    }
    
    private void setupImageReader() {
        imageReader = ImageReader.newInstance(640, 480, ImageFormat.JPEG, 1);
        imageReader.setOnImageAvailableListener(imageAvailableListener, backgroundHandler);
    }
    
    private void openCamera(String cameraId) {
        try {
            cameraManager.openCamera(cameraId, cameraStateCallback, backgroundHandler);
        } catch (CameraAccessException | SecurityException e) {
            e.printStackTrace();
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
            e.printStackTrace();
        }
    }
    
    private final CameraCaptureSession.StateCallback captureSessionCallback = 
        new CameraCaptureSession.StateCallback() {
            @Override
            public void onConfigured(CameraCaptureSession session) {
                captureSession = session;
            }
            
            @Override
            public void onConfigureFailed(CameraCaptureSession session) {
                // Handle error
            }
        };
    
    public String captureIntruderPhoto() {
        if (captureSession == null || !monitoring) {
            return null;
        }
        
        try {
            CaptureRequest.Builder captureBuilder = cameraDevice.createCaptureRequest(CameraDevice.TEMPLATE_STILL_CAPTURE);
            captureBuilder.addTarget(imageReader.getSurface());
            captureBuilder.set(CaptureRequest.CONTROL_MODE, CaptureRequest.CONTROL_MODE_AUTO);
            
            captureSession.capture(captureBuilder.build(), null, backgroundHandler);
            
            // Return placeholder path - actual implementation would wait for image
            return getIntruderPhotoPath();
        } catch (CameraAccessException e) {
            e.printStackTrace();
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
            
            File file = new File(getIntruderPhotoPath());
            file.getParentFile().mkdirs();
            
            FileOutputStream output = new FileOutputStream(file);
            output.write(bytes);
            output.close();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    
    private String getIntruderPhotoPath() {
        File photosDir = new File(context.getFilesDir(), "vaultix_security/intruder_photos");
        return new File(photosDir, "intruder_" + System.currentTimeMillis() + ".jpg").getAbsolutePath();
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
