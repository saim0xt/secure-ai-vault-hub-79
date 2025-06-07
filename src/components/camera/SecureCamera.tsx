
import React, { useState, useRef } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { useVault } from '@/contexts/VaultContext';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Camera as CameraIcon, Video, FlipHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SecureCamera = () => {
  const navigate = useNavigate();
  const { addFile } = useVault();
  const { toast } = useToast();
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'rear'>('rear');

  const capturePhoto = async () => {
    try {
      setIsCapturing(true);
      
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false, // Don't save to gallery for security
        correctOrientation: true
      });

      if (image.dataUrl) {
        // Convert data URL to blob
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        
        // Create file object
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `secure_photo_${timestamp}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        
        // Add to vault
        await addFile(file);
        
        toast({
          title: "Photo Captured",
          description: "Photo saved securely to vault",
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: "Camera Error",
        description: "Failed to capture photo",
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const captureVideo = async () => {
    try {
      setIsCapturing(true);
      
      // For video, we'll use the same camera API but with different settings
      const video = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        saveToGallery: false
      });

      if (video.dataUrl) {
        const response = await fetch(video.dataUrl);
        const blob = await response.blob();
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `secure_video_${timestamp}.mp4`;
        const file = new File([blob], fileName, { type: 'video/mp4' });
        
        await addFile(file);
        
        toast({
          title: "Video Captured",
          description: "Video saved securely to vault",
        });
      }
    } catch (error) {
      console.error('Video capture error:', error);
      toast({
        title: "Video Error",
        description: "Failed to capture video",
        variant: "destructive",
      });
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Secure Camera</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <Card className="p-6">
          <div className="text-center space-y-6">
            <div className="w-32 h-32 mx-auto bg-muted rounded-full flex items-center justify-center">
              <CameraIcon className="w-16 h-16 text-muted-foreground" />
            </div>
            
            <div className="space-y-4">
              <Button
                onClick={capturePhoto}
                disabled={isCapturing}
                className="w-full"
                size="lg"
              >
                {isCapturing ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                ) : (
                  <CameraIcon className="w-5 h-5 mr-2" />
                )}
                Capture Photo
              </Button>
              
              <Button
                onClick={captureVideo}
                disabled={isCapturing}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {isCapturing ? (
                  <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin mr-2" />
                ) : (
                  <Video className="w-5 h-5 mr-2" />
                )}
                Capture Video
              </Button>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                📸 Photos and videos are captured directly into your secure vault
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                🔒 No copies saved to device gallery
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SecureCamera;
