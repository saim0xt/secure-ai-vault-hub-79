
import React, { useState, useRef } from 'react';
import { useVault } from '@/contexts/VaultContext';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Mic, Square, Play, Pause, FileText, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VoiceRecordingService } from '@/services/VoiceRecordingService';
import { AIAPIService } from '@/services/AIAPIService';
import { AdMobService } from '@/services/AdMobService';

const VoiceRecorder = () => {
  const navigate = useNavigate();
  const { addFile } = useVault();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [autoTranscribe, setAutoTranscribe] = useState(true);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const voiceService = VoiceRecordingService.getInstance();
  const aiService = AIAPIService.getInstance();
  const adMobService = AdMobService.getInstance();

  const startRecording = async () => {
    try {
      await voiceService.startRecording();
      setIsRecording(true);
      setRecordingTime(0);
      setTranscription('');
      setAudioBlob(null);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Recording start failed:', error);
      toast({
        title: "Recording Error",
        description: "Please allow microphone access to record audio",
        variant: "destructive",
      });
    }
  };

  const stopRecording = async () => {
    try {
      const vaultFile = await voiceService.stopRecording();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Convert VaultFile back to Blob for preview
      const binaryString = atob(vaultFile.content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/webm' });
      setAudioBlob(blob);

      // Auto-transcribe if enabled
      if (autoTranscribe) {
        await transcribeRecording(vaultFile.content);
      }

      // Save to vault
      addFile(vaultFile);
      
      toast({
        title: "Recording Complete",
        description: "Voice recording saved successfully",
      });

    } catch (error) {
      console.error('Recording stop failed:', error);
      toast({
        title: "Recording Error",
        description: "Failed to save recording",
        variant: "destructive",
      });
    }
  };

  const transcribeRecording = async (audioData: string) => {
    const config = aiService.getConfig();
    if (!config.googleCloudKey) {
      toast({
        title: "API Key Required",
        description: "Please configure Google Cloud API key in settings",
        variant: "destructive",
      });
      return;
    }

    setIsTranscribing(true);
    try {
      const transcriptionText = await aiService.transcribeAudio(audioData);
      setTranscription(transcriptionText);
      
      if (transcriptionText) {
        toast({
          title: "Transcription Complete",
          description: "Audio has been transcribed successfully",
        });
      } else {
        toast({
          title: "No Speech Detected",
          description: "No speech was detected in the recording",
        });
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      toast({
        title: "Transcription Error",
        description: "Failed to transcribe audio. Check your API configuration.",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const generateSpeechFromText = async () => {
    if (!transcription) return;

    const config = aiService.getConfig();
    if (!config.elevenLabsKey) {
      toast({
        title: "API Key Required",
        description: "Please configure ElevenLabs API key in settings",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingSpeech(true);
    try {
      const audioDataUrl = await aiService.generateSpeech({
        text: transcription,
        voice: '9BWtsMINqrJLrRacOk9x', // Aria voice
        model: 'eleven_multilingual_v2'
      });

      // Play the generated speech
      const audio = new Audio(audioDataUrl);
      audio.play();

      toast({
        title: "Speech Generated",
        description: "Text has been converted to speech",
      });
    } catch (error) {
      console.error('Speech generation failed:', error);
      toast({
        title: "Speech Generation Error",
        description: "Failed to generate speech. Check your API configuration.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSpeech(false);
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
    setTranscription('');
  };

  const showRewardedAd = async () => {
    try {
      const result = await adMobService.showRewardedAd();
      if (result.rewarded) {
        toast({
          title: "Reward Earned!",
          description: "Thank you for watching the ad! Premium features unlocked temporarily.",
        });
        return true;
      }
    } catch (error) {
      console.error('Ad failed:', error);
    }
    return false;
  };

  const transcribeAudioBlob = async () => {
    if (!audioBlob) return;
    
    // Convert blob to base64
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    await transcribeRecording(base64);
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

            {/* Recording Controls */}
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

            {/* Settings */}
            <div className="pt-4 border-t border-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <label className="text-sm font-medium">Auto Transcribe</label>
                  <p className="text-xs text-muted-foreground">
                    Automatically convert speech to text
                  </p>
                </div>
                <Switch
                  checked={autoTranscribe}
                  onCheckedChange={setAutoTranscribe}
                />
              </div>
            </div>

            {/* Transcription Results */}
            {(transcription || isTranscribing) && (
              <Card className="p-4 bg-muted">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <span className="text-sm font-medium">Transcription</span>
                  </div>
                  
                  {isTranscribing ? (
                    <div className="text-center">
                      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Transcribing audio...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-left">{transcription}</p>
                      <Button
                        onClick={generateSpeechFromText}
                        disabled={isGeneratingSpeech}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Volume2 className="w-4 h-4 mr-2" />
                        {isGeneratingSpeech ? 'Generating...' : 'Convert to Speech'}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Manual Transcription Button */}
            {audioBlob && !autoTranscribe && !transcription && (
              <Button
                onClick={transcribeAudioBlob}
                disabled={isTranscribing}
                variant="outline"
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                {isTranscribing ? 'Transcribing...' : 'Transcribe Audio'}
              </Button>
            )}

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                🎤 High-quality voice recording with AI transcription
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
