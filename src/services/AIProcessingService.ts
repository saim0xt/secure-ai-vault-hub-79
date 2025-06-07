
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export interface AIAnalysisResult {
  contentType: 'safe' | 'nsfw' | 'questionable';
  tags: string[];
  description: string;
  confidence: number;
  categories: string[];
  textContent?: string;
  objects?: { name: string; confidence: number }[];
}

export interface VoiceTranscription {
  text: string;
  confidence: number;
  language: string;
  timestamp: string;
}

export class AIProcessingService {
  private static instance: AIProcessingService;
  private openAIKey: string = '';
  private googleCloudKey: string = '';

  static getInstance(): AIProcessingService {
    if (!AIProcessingService.instance) {
      AIProcessingService.instance = new AIProcessingService();
    }
    return AIProcessingService.instance;
  }

  async setAPIKeys(openAI: string, googleCloud: string): Promise<void> {
    this.openAIKey = openAI;
    this.googleCloudKey = googleCloud;
    await Preferences.set({ 
      key: 'vaultix_ai_keys', 
      value: JSON.stringify({ openAI, googleCloud }) 
    });
  }

  async loadAPIKeys(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_ai_keys' });
      if (value) {
        const keys = JSON.parse(value);
        this.openAIKey = keys.openAI || '';
        this.googleCloudKey = keys.googleCloud || '';
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    }
  }

  async analyzeImage(imageData: string): Promise<AIAnalysisResult> {
    try {
      // NSFW Detection using OpenAI Vision API
      const nsfwResult = await this.detectNSFW(imageData);
      
      // Object detection and tagging
      const objectDetection = await this.detectObjects(imageData);
      
      // Generate description
      const description = await this.generateImageDescription(imageData);

      return {
        contentType: nsfwResult.isNSFW ? 'nsfw' : 'safe',
        tags: objectDetection.tags,
        description: description,
        confidence: nsfwResult.confidence,
        categories: objectDetection.categories,
        objects: objectDetection.objects
      };
    } catch (error) {
      console.error('Image analysis failed:', error);
      // Fallback analysis
      return {
        contentType: 'safe',
        tags: ['image'],
        description: 'Image uploaded to vault',
        confidence: 0.5,
        categories: ['general'],
        objects: []
      };
    }
  }

  private async detectNSFW(imageData: string): Promise<{ isNSFW: boolean; confidence: number }> {
    if (!this.openAIKey) {
      return { isNSFW: false, confidence: 0 };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [{
              type: 'text',
              text: 'Analyze this image for NSFW content. Return only a JSON response with "isNSFW" (boolean) and "confidence" (0-1).'
            }, {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageData}` }
            }]
          }],
          max_tokens: 100
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      const analysis = JSON.parse(result.choices[0].message.content);
      return analysis;
    } catch (error) {
      console.error('NSFW detection failed:', error);
      return { isNSFW: false, confidence: 0 };
    }
  }

  private async detectObjects(imageData: string): Promise<{ tags: string[]; categories: string[]; objects: any[] }> {
    if (!this.googleCloudKey) {
      return { tags: ['image'], categories: ['general'], objects: [] };
    }

    try {
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${this.googleCloudKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [{
            image: { content: imageData },
            features: [
              { type: 'LABEL_DETECTION', maxResults: 10 },
              { type: 'OBJECT_LOCALIZATION', maxResults: 10 }
            ]
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Google Vision API error: ${response.status}`);
      }

      const result = await response.json();
      const annotations = result.responses[0];
      
      const tags = annotations.labelAnnotations?.map((label: any) => label.description.toLowerCase()) || [];
      const categories = [...new Set(tags.map((tag: string) => tag.split(' ')[0]))];
      const objects = annotations.localizedObjectAnnotations?.map((obj: any) => ({
        name: obj.name,
        confidence: obj.score
      })) || [];

      return { tags, categories, objects };
    } catch (error) {
      console.error('Object detection failed:', error);
      return { tags: ['image'], categories: ['general'], objects: [] };
    }
  }

  private async generateImageDescription(imageData: string): Promise<string> {
    if (!this.openAIKey) {
      return 'Image uploaded to vault';
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openAIKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [{
              type: 'text',
              text: 'Provide a brief, descriptive caption for this image in 1-2 sentences.'
            }, {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageData}` }
            }]
          }],
          max_tokens: 150
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      return result.choices[0].message.content;
    } catch (error) {
      console.error('Description generation failed:', error);
      return 'Image uploaded to vault';
    }
  }

  async transcribeAudio(audioData: string): Promise<VoiceTranscription> {
    if (!this.googleCloudKey) {
      throw new Error('Google Cloud API key required for transcription');
    }

    try {
      const response = await fetch(`https://speech.googleapis.com/v1/speech:recognize?key=${this.googleCloudKey}`, {
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
            enableWordTimeOffsets: true
          },
          audio: { content: audioData }
        })
      });

      if (!response.ok) {
        throw new Error(`Google Speech API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.results && result.results.length > 0) {
        const alternative = result.results[0].alternatives[0];
        return {
          text: alternative.transcript,
          confidence: alternative.confidence || 0.8,
          language: 'en-US',
          timestamp: new Date().toISOString()
        };
      }

      throw new Error('No transcription results');
    } catch (error) {
      console.error('Audio transcription failed:', error);
      throw new Error('Failed to transcribe audio');
    }
  }

  async generateSmartInsights(files: any[]): Promise<any> {
    try {
      const fileStats = this.analyzeFileUsage(files);
      const recommendations = await this.generateRecommendations(fileStats);
      
      return {
        totalFiles: files.length,
        storageUsed: fileStats.totalSize,
        mostUsedCategory: fileStats.topCategory,
        recommendations: recommendations,
        duplicateFiles: await this.findDuplicates(files),
        organizationScore: this.calculateOrganizationScore(files)
      };
    } catch (error) {
      console.error('Smart insights generation failed:', error);
      throw new Error('Failed to generate insights');
    }
  }

  private analyzeFileUsage(files: any[]): any {
    const categories: { [key: string]: number } = {};
    let totalSize = 0;
    
    files.forEach(file => {
      const type = file.type || 'unknown';
      categories[type] = (categories[type] || 0) + 1;
      totalSize += file.size || 0;
    });

    const topCategory = Object.keys(categories).reduce((a, b) => 
      categories[a] > categories[b] ? a : b, 'unknown'
    );

    return { categories, totalSize, topCategory };
  }

  private async generateRecommendations(stats: any): Promise<string[]> {
    const recommendations = [];
    
    if (stats.totalSize > 500 * 1024 * 1024) { // 500MB
      recommendations.push('Consider backing up older files to free up space');
    }
    
    if (stats.categories.image > 50) {
      recommendations.push('Create albums to organize your photos better');
    }
    
    if (stats.categories.document > 20) {
      recommendations.push('Group documents by project or date');
    }

    if (Object.keys(stats.categories).length > 10) {
      recommendations.push('Use auto-tagging to better categorize your files');
    }

    return recommendations;
  }

  private async findDuplicates(files: any[]): Promise<any[]> {
    const duplicates = [];
    const seen = new Map();
    
    for (const file of files) {
      const key = `${file.name}_${file.size}`;
      if (seen.has(key)) {
        duplicates.push({
          original: seen.get(key),
          duplicate: file
        });
      } else {
        seen.set(key, file);
      }
    }
    
    return duplicates;
  }

  private calculateOrganizationScore(files: any[]): number {
    if (files.length === 0) return 100;
    
    let score = 100;
    
    // Deduct points for unorganized files
    const unorganizedFiles = files.filter(f => !f.folderId).length;
    score -= (unorganizedFiles / files.length) * 30;
    
    // Deduct points for lack of tags
    const untaggedFiles = files.filter(f => !f.tags || f.tags.length === 0).length;
    score -= (untaggedFiles / files.length) * 20;
    
    // Reward for good naming conventions
    const wellNamedFiles = files.filter(f => f.name && f.name.length > 5).length;
    score += (wellNamedFiles / files.length) * 10;
    
    return Math.max(0, Math.round(score));
  }
}
