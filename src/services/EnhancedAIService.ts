
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Camera, CameraResultType } from '@capacitor/camera';

export interface AIConfig {
  openAIKey: string;
  googleCloudKey: string;
  anthropicKey: string;
  enabled: boolean;
}

export interface DocumentOCRResult {
  text: string;
  confidence: number;
  language: string;
  blocks: TextBlock[];
  words: Word[];
}

export interface TextBlock {
  text: string;
  boundingBox: BoundingBox;
  confidence: number;
}

export interface Word {
  text: string;
  boundingBox: BoundingBox;
  confidence: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AdvancedCategorization {
  category: string;
  subcategory: string;
  tags: string[];
  confidence: number;
  metadata: Record<string, any>;
  suggestedActions: string[];
}

export interface NSFWDetectionResult {
  isNSFW: boolean;
  confidence: number;
  categories: {
    explicit: number;
    suggestive: number;
    medical: number;
    violence: number;
    racy: number;
  };
  safetyRating: 'VERY_UNLIKELY' | 'UNLIKELY' | 'POSSIBLE' | 'LIKELY' | 'VERY_LIKELY';
}

export class EnhancedAIService {
  private static instance: EnhancedAIService;
  private config: AIConfig = {
    openAIKey: '',
    googleCloudKey: '',
    anthropicKey: '',
    enabled: false
  };

  static getInstance(): EnhancedAIService {
    if (!EnhancedAIService.instance) {
      EnhancedAIService.instance = new EnhancedAIService();
    }
    return EnhancedAIService.instance;
  }

  async initialize(): Promise<void> {
    await this.loadConfig();
  }

  async loadConfig(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_enhanced_ai_config' });
      if (value) {
        this.config = { ...this.config, ...JSON.parse(value) };
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }
  }

  async saveConfig(config: Partial<AIConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    try {
      await Preferences.set({
        key: 'vaultix_enhanced_ai_config',
        value: JSON.stringify(this.config)
      });
    } catch (error) {
      console.error('Failed to save AI config:', error);
    }
  }

  async performOCR(imageData: string): Promise<DocumentOCRResult> {
    if (!this.config.googleCloudKey) {
      throw new Error('Google Cloud API key required for OCR');
    }

    try {
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.config.googleCloudKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: { content: imageData },
            features: [
              { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
              { type: 'TEXT_DETECTION', maxResults: 50 }
            ],
            imageContext: {
              languageHints: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh']
            }
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Google Vision API error: ${response.status}`);
      }

      const result = await response.json();
      const annotations = result.responses[0];

      if (!annotations.fullTextAnnotation) {
        return {
          text: '',
          confidence: 0,
          language: 'unknown',
          blocks: [],
          words: []
        };
      }

      const fullText = annotations.fullTextAnnotation;
      const textAnnotations = annotations.textAnnotations || [];

      const blocks: TextBlock[] = fullText.pages?.[0]?.blocks?.map((block: any) => ({
        text: block.paragraphs?.map((p: any) => 
          p.words?.map((w: any) => 
            w.symbols?.map((s: any) => s.text).join('')
          ).join(' ')
        ).join('\n') || '',
        boundingBox: this.extractBoundingBox(block.boundingBox),
        confidence: block.confidence || 0.8
      })) || [];

      const words: Word[] = textAnnotations.slice(1).map((annotation: any) => ({
        text: annotation.description,
        boundingBox: this.extractBoundingBox(annotation.boundingPoly),
        confidence: annotation.confidence || 0.8
      }));

      return {
        text: fullText.text,
        confidence: fullText.confidence || 0.8,
        language: this.detectLanguage(fullText.text),
        blocks,
        words
      };
    } catch (error) {
      console.error('OCR failed:', error);
      throw new Error('Failed to perform OCR on document');
    }
  }

  async advancedCategorization(fileData: string, fileName: string, fileType: string): Promise<AdvancedCategorization> {
    if (!this.config.openAIKey) {
      throw new Error('OpenAI API key required for advanced categorization');
    }

    try {
      const isImage = fileType.startsWith('image/');
      
      const messages = [{
        role: 'system',
        content: `You are an advanced file categorization AI. Analyze the provided ${isImage ? 'image' : 'file'} and provide detailed categorization including category, subcategory, relevant tags, confidence score, metadata, and suggested actions. Return only valid JSON.`
      }, {
        role: 'user',
        content: isImage ? [{
          type: 'text',
          text: `Categorize this image file named "${fileName}". Provide comprehensive analysis.`
        }, {
          type: 'image_url',
          image_url: { url: `data:${fileType};base64,${fileData}` }
        }] : `Categorize this file: "${fileName}" of type "${fileType}". Provide comprehensive analysis based on the filename and type.`
      }];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages,
          max_tokens: 500,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      const analysis = JSON.parse(result.choices[0].message.content);

      return {
        category: analysis.category || 'general',
        subcategory: analysis.subcategory || 'miscellaneous',
        tags: analysis.tags || [],
        confidence: analysis.confidence || 0.7,
        metadata: analysis.metadata || {},
        suggestedActions: analysis.suggestedActions || []
      };
    } catch (error) {
      console.error('Advanced categorization failed:', error);
      return {
        category: 'general',
        subcategory: 'uncategorized',
        tags: [fileType.split('/')[0]],
        confidence: 0.5,
        metadata: { fileName, fileType },
        suggestedActions: ['Review manually']
      };
    }
  }

  async enhancedNSFWDetection(imageData: string): Promise<NSFWDetectionResult> {
    if (!this.config.googleCloudKey) {
      throw new Error('Google Cloud API key required for NSFW detection');
    }

    try {
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.config.googleCloudKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: { content: imageData },
            features: [
              { type: 'SAFE_SEARCH_DETECTION', maxResults: 1 }
            ]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Google Vision API error: ${response.status}`);
      }

      const result = await response.json();
      const safeSearch = result.responses[0].safeSearchAnnotation;

      if (!safeSearch) {
        return {
          isNSFW: false,
          confidence: 0.5,
          categories: { explicit: 0, suggestive: 0, medical: 0, violence: 0, racy: 0 },
          safetyRating: 'VERY_UNLIKELY'
        };
      }

      const ratingToScore = (rating: string): number => {
        switch (rating) {
          case 'VERY_UNLIKELY': return 0.1;
          case 'UNLIKELY': return 0.3;
          case 'POSSIBLE': return 0.5;
          case 'LIKELY': return 0.7;
          case 'VERY_LIKELY': return 0.9;
          default: return 0.5;
        }
      };

      const explicitScore = ratingToScore(safeSearch.adult);
      const suggestiveScore = ratingToScore(safeSearch.racy);
      const medicalScore = ratingToScore(safeSearch.medical);
      const violenceScore = ratingToScore(safeSearch.violence);

      const maxScore = Math.max(explicitScore, suggestiveScore, violenceScore);
      const isNSFW = maxScore > 0.6;

      return {
        isNSFW,
        confidence: maxScore,
        categories: {
          explicit: explicitScore,
          suggestive: suggestiveScore,
          medical: medicalScore,
          violence: violenceScore,
          racy: suggestiveScore
        },
        safetyRating: safeSearch.adult
      };
    } catch (error) {
      console.error('NSFW detection failed:', error);
      return {
        isNSFW: false,
        confidence: 0.5,
        categories: { explicit: 0, suggestive: 0, medical: 0, violence: 0, racy: 0 },
        safetyRating: 'VERY_UNLIKELY'
      };
    }
  }

  async enhancedVoiceTranscription(audioData: string, options: {
    language?: string;
    enhancedModel?: boolean;
    speakerDiarization?: boolean;
    punctuation?: boolean;
  } = {}): Promise<{
    text: string;
    confidence: number;
    language: string;
    speakers?: Array<{ speaker: string; text: string; startTime: number; endTime: number }>;
    wordTimestamps?: Array<{ word: string; startTime: number; endTime: number; confidence: number }>;
  }> {
    if (!this.config.googleCloudKey) {
      throw new Error('Google Cloud API key required for voice transcription');
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
            languageCode: options.language || 'en-US',
            enableAutomaticPunctuation: options.punctuation !== false,
            enableWordTimeOffsets: true,
            enableSpeakerDiarization: options.speakerDiarization || false,
            diarizationConfig: options.speakerDiarization ? {
              enableSpeakerDiarization: true,
              minSpeakerCount: 1,
              maxSpeakerCount: 6
            } : undefined,
            model: options.enhancedModel ? 'latest_long' : 'latest_short',
            useEnhanced: options.enhancedModel || false
          },
          audio: { content: audioData }
        })
      });

      if (!response.ok) {
        throw new Error(`Google Speech API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.results || result.results.length === 0) {
        throw new Error('No transcription results');
      }

      const alternative = result.results[0].alternatives[0];
      const words = alternative.words || [];

      return {
        text: alternative.transcript,
        confidence: alternative.confidence || 0.8,
        language: options.language || 'en-US',
        wordTimestamps: words.map((word: any) => ({
          word: word.word,
          startTime: parseFloat(word.startTime?.seconds || '0') + (parseFloat(word.startTime?.nanos || '0') / 1e9),
          endTime: parseFloat(word.endTime?.seconds || '0') + (parseFloat(word.endTime?.nanos || '0') / 1e9),
          confidence: word.confidence || 0.8
        }))
      };
    } catch (error) {
      console.error('Enhanced voice transcription failed:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  private extractBoundingBox(boundingPoly: any): BoundingBox {
    if (!boundingPoly || !boundingPoly.vertices) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    const vertices = boundingPoly.vertices;
    const xs = vertices.map((v: any) => v.x || 0);
    const ys = vertices.map((v: any) => v.y || 0);

    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys)
    };
  }

  private detectLanguage(text: string): string {
    // Simple language detection based on character patterns
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
    if (/[\uac00-\ud7af]/.test(text)) return 'ko';
    if (/[\u0400-\u04ff]/.test(text)) return 'ru';
    if (/[\u0590-\u05ff]/.test(text)) return 'he';
    if (/[\u0600-\u06ff]/.test(text)) return 'ar';
    return 'en';
  }

  getConfig(): AIConfig {
    return { ...this.config };
  }
}
