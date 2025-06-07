
import React, { useState, useRef } from 'react';
import { useVault } from '@/contexts/VaultContext';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mic, Square, Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const VoiceRecorder = () => {
  const navigate = useNavigate();
  const { addFile } = useVault();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Microphone access denied:', error);
      toast({
        title: "Microphone Error",
        description: "Please allow microphone access to record audio",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const saveRecording = async () => {
    if (!audioBlob) return;
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `voice_note_${timestamp}.webm`;
      const file = new File([audioBlob], fileName, { type: 'audio/webm' });
      
      await addFile(file);
      
      toast({
        title: "Recording Saved",
        description: "Voice note saved securely to vault",
      });
      
      // Reset state
      setAudioBlob(null);
      setRecordingTime(0);
      
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Error",
        description: "Failed to save recording",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const discardRecording = () => {
    setAudioBlob(null);
    setRecordingTime(0);
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
          <h1 className="text-xl font-bold text-foreground">Voice Recorder</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <Card className="p-6">
          <div className="text-center space-y-6">
            <div className="w-32 h-32 mx-auto bg-gradient-to-r from-red-500 to-pink-600 rounded-full flex items-center justify-center">
              <Mic className="w-16 h-16 text-white" />
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-mono font-bold text-foreground">
                {formatTime(recordingTime)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {isRecording ? 'Recording...' : audioBlob ? 'Recording Complete' : 'Ready to Record'}
              </p>
            </div>

            <div className="space-y-4">
              {!isRecording && !audioBlob && (
                <Button
                  onClick={startRecording}
                  className="w-full bg-red-500 hover:bg-red-600"
                  size="lg"
                >
                  <Mic className="w-5 h-5 mr-2" />
                  Start Recording
                </Button>
              )}

              {isRecording && (
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  <Square className="w-5 h-5 mr-2" />
                  Stop Recording
                </Button>
              )}

              {audioBlob && (
                <div className="space-y-3">
                  <Button
                    onClick={saveRecording}
                    className="w-full"
                    size="lg"
                  >
                    Save to Vault
                  </Button>
                  <div className="flex space-x-2">
                    <Button
                      onClick={startRecording}
                      variant="outline"
                      className="flex-1"
                    >
                      Record Again
                    </Button>
                    <Button
                      onClick={discardRecording}
                      variant="outline"
                      className="flex-1"
                    >
                      Discard
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                🎤 High-quality voice recording with noise cancellation
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                🔒 Recordings are encrypted and stored securely
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default VoiceRecorder;
