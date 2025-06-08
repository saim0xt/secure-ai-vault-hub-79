
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import { VaultFile } from '@/contexts/VaultContext';

export interface RecordingConfig {
  sampleRate: number;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  format: string;
}

export interface VoiceRecording {
  id: string;
  name: string;
  duration: number;
  size: number;
  timestamp: string;
  transcription?: string;
  data: string;
}

export class VoiceRecordingService {
  private static instance: VoiceRecordingService;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  
  static getInstance(): VoiceRecordingService {
    if (!VoiceRecordingService.instance) {
      VoiceRecordingService.instance = new VoiceRecordingService();
    }
    return VoiceRecordingService.instance;
  }

  async startRecording(config?: Partial<RecordingConfig>): Promise<void> {
    try {
      const defaultConfig: RecordingConfig = {
        sampleRate: 44100,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        format: 'audio/webm;codecs=opus'
      };

      const recordingConfig = { ...defaultConfig, ...config };

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: recordingConfig.sampleRate,
          echoCancellation: recordingConfig.echoCancellation,
          noiseSuppression: recordingConfig.noiseSuppression,
          autoGainControl: recordingConfig.autoGainControl
        }
      });

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: recordingConfig.format
      });

      this.chunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.start(1000); // Collect data every second
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw new Error('Microphone access denied or recording failed');
    }
  }

  async stopRecording(): Promise<VaultFile> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(this.chunks, { type: 'audio/webm' });
          const vaultFile = await this.processRecording(blob);
          
          // Clean up
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
          }
          this.mediaRecorder = null;
          this.chunks = [];
          
          resolve(vaultFile);
        } catch (error) {
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  private async processRecording(blob: Blob): Promise<VaultFile> {
    const timestamp = new Date().toISOString();
    const fileName = `voice_${Date.now()}.webm`;
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Convert blob to base64
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Save recording to secure directory
    await Filesystem.writeFile({
      path: `secure_recordings/${fileName}`,
      data: base64,
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });

    return {
      id: fileId,
      name: fileName,
      type: 'audio' as const,
      size: blob.size,
      dateAdded: timestamp,
      category: 'audio',
      tags: ['voice', 'recording'],
      content: base64,
      path: `secure_recordings/${fileName}`,
      metadata: {
        duration: await this.calculateDuration(blob),
        format: 'webm',
        codec: 'opus'
      }
    };
  }

  private async calculateDuration(blob: Blob): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
      };
      audio.src = URL.createObjectURL(blob);
    });
  }

  async transcribeRecording(recordingData: string, apiKey: string): Promise<string> {
    if (!apiKey) {
      throw new Error('Google Cloud Speech API key required for transcription');
    }

    try {
      const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: 'en-US',
            enableAutomaticPunctuation: true,
            enableWordTimeOffsets: false,
            model: 'latest_short',
            useEnhanced: true
          },
          audio: { content: recordingData }
        })
      });

      if (!response.ok) {
        throw new Error(`Transcription API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.results || result.results.length === 0) {
        return '';
      }

      return result.results[0].alternatives[0].transcript || '';
    } catch (error) {
      console.error('Transcription failed:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  async getStoredRecordings(): Promise<VaultFile[]> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_voice_recordings' });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('Failed to get stored recordings:', error);
      return [];
    }
  }

  async saveRecording(recording: VaultFile): Promise<void> {
    try {
      const recordings = await this.getStoredRecordings();
      recordings.push(recording);
      
      await Preferences.set({
        key: 'vaultix_voice_recordings',
        value: JSON.stringify(recordings)
      });
    } catch (error) {
      console.error('Failed to save recording:', error);
      throw new Error('Failed to save recording');
    }
  }

  async deleteRecording(recordingId: string): Promise<void> {
    try {
      const recordings = await this.getStoredRecordings();
      const updatedRecordings = recordings.filter(r => r.id !== recordingId);
      
      await Preferences.set({
        key: 'vaultix_voice_recordings',
        value: JSON.stringify(updatedRecordings)
      });
    } catch (error) {
      console.error('Failed to delete recording:', error);
      throw new Error('Failed to delete recording');
    }
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  pauseRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder?.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }
}
