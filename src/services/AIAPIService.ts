
import { Preferences } from '@capacitor/preferences';

export interface AIAPIConfig {
  openAIKey: string;
  googleCloudKey: string;
  anthropicKey: string;
  elevenLabsKey: string;
  enabled: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TTSRequest {
  text: string;
  voice: string;
  model: string;
}

export class AIAPIService {
  private static instance: AIAPIService;
  private config: AIAPIConfig = {
    openAIKey: '',
    googleCloudKey: '',
    anthropicKey: '',
    elevenLabsKey: '',
    enabled: false
  };

  static getInstance(): AIAPIService {
    if (!AIAPIService.instance) {
      AIAPIService.instance = new AIAPIService();
    }
    return AIAPIService.instance;
  }

  async initialize(): Promise<void> {
    await this.loadConfig();
  }

  async loadConfig(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_ai_api_config' });
      if (value) {
        this.config = { ...this.config, ...JSON.parse(value) };
      }
    } catch (error) {
      console.error('Failed to load AI API config:', error);
    }
  }

  async saveConfig(config: Partial<AIAPIConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    try {
      await Preferences.set({
        key: 'vaultix_ai_api_config',
        value: JSON.stringify(this.config)
      });
    } catch (error) {
      console.error('Failed to save AI API config:', error);
    }
  }

  async generateText(messages: ChatMessage[], model: string = 'gpt-4'): Promise<string> {
    if (!this.config.openAIKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      return result.choices[0].message.content;
    } catch (error) {
      console.error('Text generation failed:', error);
      throw new Error('Failed to generate text');
    }
  }

  async analyzeImage(imageData: string, prompt: string): Promise<string> {
    if (!this.config.openAIKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [{
              type: 'text',
              text: prompt
            }, {
              type: 'image_url',
              image_url: { url: imageData }
            }]
          }],
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      return result.choices[0].message.content;
    } catch (error) {
      console.error('Image analysis failed:', error);
      throw new Error('Failed to analyze image');
    }
  }

  async performOCR(imageData: string): Promise<string> {
    if (!this.config.googleCloudKey) {
      throw new Error('Google Cloud API key not configured');
    }

    try {
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.config.googleCloudKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: { content: imageData.split(',')[1] }, // Remove data:image/jpeg;base64, prefix
            features: [{ type: 'TEXT_DETECTION', maxResults: 1 }]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Google Vision API error: ${response.status}`);
      }

      const result = await response.json();
      const annotations = result.responses[0].textAnnotations;
      
      return annotations?.[0]?.description || '';
    } catch (error) {
      console.error('OCR failed:', error);
      throw new Error('Failed to perform OCR');
    }
  }

  async transcribeAudio(audioData: string): Promise<string> {
    if (!this.config.googleCloudKey) {
      throw new Error('Google Cloud API key not configured');
    }

    try {
      const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${this.config.googleCloudKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {
            encoding: 'WEBM_OPUS',
            sampleRateHertz: 48000,
            languageCode: 'en-US',
            enableAutomaticPunctuation: true
          },
          audio: { content: audioData }
        })
      });

      if (!response.ok) {
        throw new Error(`Google Speech API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.results || result.results.length === 0) {
        return '';
      }

      return result.results[0].alternatives[0].transcript || '';
    } catch (error) {
      console.error('Audio transcription failed:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  async generateSpeech(request: TTSRequest): Promise<string> {
    if (!this.config.elevenLabsKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${request.voice}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.elevenLabsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: request.text,
          model_id: request.model,
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
      
      return `data:audio/mpeg;base64,${base64Audio}`;
    } catch (error) {
      console.error('Speech generation failed:', error);
      throw new Error('Failed to generate speech');
    }
  }

  async detectSentiment(text: string): Promise<{ sentiment: string; confidence: number }> {
    if (!this.config.openAIKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const prompt = `Analyze the sentiment of this text and respond with only a JSON object containing "sentiment" (positive/negative/neutral) and "confidence" (0-1): "${text}"`;
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 100,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      const analysis = JSON.parse(result.choices[0].message.content);
      
      return {
        sentiment: analysis.sentiment || 'neutral',
        confidence: analysis.confidence || 0.5
      };
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      return { sentiment: 'neutral', confidence: 0.5 };
    }
  }

  async generateSummary(text: string): Promise<string> {
    if (!this.config.openAIKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'user',
            content: `Please provide a concise summary of the following text:\n\n${text}`
          }],
          max_tokens: 200,
          temperature: 0.5
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      return result.choices[0].message.content;
    } catch (error) {
      console.error('Summary generation failed:', error);
      throw new Error('Failed to generate summary');
    }
  }

  getConfig(): AIAPIConfig {
    return { ...this.config };
  }

  hasValidKeys(): boolean {
    return !!(this.config.openAIKey && this.config.googleCloudKey);
  }
}
