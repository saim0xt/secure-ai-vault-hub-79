
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Brain, BookOpen, Tags, Sparkles, Mic, Camera, Key } from 'lucide-react';
import { AIProcessingService } from '@/services/AIProcessingService';
import { useToast } from '@/hooks/use-toast';

const AIFeatures = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [diaryEntry, setDiaryEntry] = useState('');
  const [mood, setMood] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiKeys, setApiKeys] = useState({ openAI: '', googleCloud: '' });
  const [showApiSetup, setShowApiSetup] = useState(false);
  const [smartInsights, setSmartInsights] = useState<any>(null);

  const aiService = AIProcessingService.getInstance();

  useEffect(() => {
    initializeAI();
  }, []);

  const initializeAI = async () => {
    try {
      await aiService.loadAPIKeys();
      // Check if we need API key setup
      // In real implementation, you'd check if keys are configured
    } catch (error) {
      console.error('Failed to initialize AI services:', error);
    }
  };

  const handleAPIKeySetup = async () => {
    if (!apiKeys.openAI || !apiKeys.googleCloud) {
      toast({
        title: "API Keys Required",
        description: "Please enter both OpenAI and Google Cloud API keys",
        variant: "destructive",
      });
      return;
    }

    try {
      await aiService.setAPIKeys(apiKeys.openAI, apiKeys.googleCloud);
      setShowApiSetup(false);
      
      toast({
        title: "API Keys Saved",
        description: "AI services are now configured and ready to use",
      });
    } catch (error) {
      toast({
        title: "Setup Failed",
        description: "Failed to save API keys",
        variant: "destructive",
      });
    }
  };

  const analyzeMood = async (text: string) => {
    if (!text || text.length < 10) return '';

    // Simple mood analysis based on keywords
    const positiveWords = ['happy', 'joy', 'excited', 'great', 'awesome', 'love', 'wonderful'];
    const negativeWords = ['sad', 'angry', 'frustrated', 'tired', 'stressed', 'worried', 'anxious'];
    const neutralWords = ['okay', 'fine', 'normal', 'regular', 'usual'];

    const words = text.toLowerCase().split(' ');
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    words.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
      if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
      if (neutralWords.some(neu => word.includes(neu))) neutralCount++;
    });

    if (positiveCount > negativeCount && positiveCount > neutralCount) {
      return 'positive';
    } else if (negativeCount > positiveCount && negativeCount > neutralCount) {
      return 'negative';
    } else {
      return 'neutral';
    }
  };

  const handleDiarySubmit = async () => {
    if (!diaryEntry.trim()) return;
    
    setIsAnalyzing(true);
    
    try {
      // Analyze mood
      const detectedMood = await analyzeMood(diaryEntry);
      setMood(detectedMood);

      // Save diary entry
      const entry = {
        id: Date.now().toString(),
        text: diaryEntry,
        mood: detectedMood,
        timestamp: new Date().toISOString(),
        tags: extractTags(diaryEntry)
      };

      // In real implementation, save to vault
      console.log('Diary entry saved:', entry);
      
      toast({
        title: "Entry Saved",
        description: `Mood detected: ${detectedMood}. Entry saved to your private diary.`,
      });
      
      setDiaryEntry('');
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Could not analyze diary entry",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const extractTags = (text: string): string[] => {
    // Simple tag extraction based on common themes
    const tagMap = {
      work: ['work', 'job', 'office', 'meeting', 'project', 'boss', 'colleague'],
      family: ['family', 'mom', 'dad', 'sister', 'brother', 'parents', 'children'],
      health: ['health', 'exercise', 'gym', 'doctor', 'medicine', 'fitness'],
      travel: ['travel', 'trip', 'vacation', 'flight', 'hotel', 'visit'],
      food: ['food', 'restaurant', 'cooking', 'dinner', 'lunch', 'breakfast'],
      relationships: ['friend', 'relationship', 'date', 'love', 'partner']
    };

    const words = text.toLowerCase().split(/\s+/);
    const foundTags: string[] = [];

    Object.entries(tagMap).forEach(([tag, keywords]) => {
      if (keywords.some(keyword => words.some(word => word.includes(keyword)))) {
        foundTags.push(tag);
      }
    });

    return foundTags;
  };

  const generateSmartInsights = async () => {
    try {
      // Get vault files (mock data for now)
      const mockFiles = [
        { id: '1', name: 'photo1.jpg', type: 'image', size: 1024 * 1024 },
        { id: '2', name: 'document.pdf', type: 'document', size: 512 * 1024 },
        // Add more mock files...
      ];

      const insights = await aiService.generateSmartInsights(mockFiles);
      setSmartInsights(insights);
    } catch (error) {
      console.error('Failed to generate insights:', error);
    }
  };

  const aiFeatures = [
    {
      title: 'AI Diary',
      description: 'Smart journaling with mood analysis',
      icon: BookOpen,
      color: 'from-blue-500 to-purple-600',
      action: () => console.log('AI Diary focused'),
    },
    {
      title: 'Auto Tagging',
      description: 'AI-powered file categorization',
      icon: Tags,
      color: 'from-green-500 to-blue-600',
      action: () => toast({ title: "Auto Tagging", description: "AI tagging enabled for new files" }),
    },
    {
      title: 'Smart Insights',
      description: 'AI analytics and recommendations',
      icon: Sparkles,
      color: 'from-purple-500 to-pink-600',
      action: generateSmartInsights,
    },
    {
      title: 'Voice Notes',
      description: 'Speech-to-text with AI transcription',
      icon: Mic,
      color: 'from-orange-500 to-red-600',
      action: () => navigate('/voice-recorder'),
    },
  ];

  const dailyPrompts = [
    "What made you smile today?",
    "Describe a challenge you overcame.",
    "What are you grateful for right now?",
    "How did you grow today?",
    "What's on your mind lately?",
    "What was the highlight of your day?",
    "How are you feeling about your goals?",
    "What lesson did you learn today?",
  ];

  const getMoodAnalysis = (mood: string) => {
    switch (mood) {
      case 'positive':
        return {
          color: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-50 dark:bg-green-950/20',
          message: 'Your entry reflects a positive and uplifting mood. Keep nurturing these positive thoughts!'
        };
      case 'negative':
        return {
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-50 dark:bg-red-950/20',
          message: 'It seems you\'re going through some challenges. Remember that difficult times are temporary.'
        };
      default:
        return {
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-50 dark:bg-blue-950/20',
          message: 'Your entry shows a balanced and thoughtful perspective. Consider exploring these feelings further.'
        };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center space-x-3">
            <Brain className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">AI Features</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowApiSetup(true)}
          >
            <Key className="w-4 h-4 mr-2" />
            Setup AI
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* API Setup Modal */}
        {showApiSetup && (
          <Card className="p-4 border-2 border-primary">
            <h3 className="font-semibold text-foreground mb-4">AI Service Configuration</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">OpenAI API Key</label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={apiKeys.openAI}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, openAI: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Google Cloud API Key</label>
                <Input
                  type="password"
                  placeholder="AIza..."
                  value={apiKeys.googleCloud}
                  onChange={(e) => setApiKeys(prev => ({ ...prev, googleCloud: e.target.value }))}
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleAPIKeySetup}>Save Keys</Button>
                <Button variant="outline" onClick={() => setShowApiSetup(false)}>Cancel</Button>
              </div>
            </div>
          </Card>
        )}

        {/* AI Features Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {aiFeatures.map((feature, index) => (
            <Card 
              key={feature.title}
              className="p-4 cursor-pointer hover:shadow-lg transition-all"
              onClick={feature.action}
            >
              <div className="text-center">
                <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* AI Diary Section */}
        <Card className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            <BookOpen className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-foreground">AI Diary</h2>
          </div>
          
          {/* Daily Prompt */}
          <div className="bg-muted/50 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-foreground mb-1">Today's Prompt:</p>
            <p className="text-sm text-muted-foreground">
              {dailyPrompts[Math.floor(Math.random() * dailyPrompts.length)]}
            </p>
          </div>

          {/* Diary Entry */}
          <div className="space-y-3">
            <Textarea
              placeholder="Write your thoughts here... AI will analyze your mood and provide insights."
              value={diaryEntry}
              onChange={(e) => setDiaryEntry(e.target.value)}
              rows={4}
              className="resize-none"
            />
            
            {diaryEntry && (
              <div className={`${getMoodAnalysis(mood).bg} rounded-lg p-3`}>
                <p className={`text-sm font-medium ${getMoodAnalysis(mood).color} mb-1`}>
                  AI Mood Analysis:
                </p>
                <p className={`text-sm ${getMoodAnalysis(mood).color}`}>
                  {diaryEntry.length > 20 
                    ? getMoodAnalysis(mood).message
                    : "Write more to get detailed mood insights..."
                  }
                </p>
              </div>
            )}

            <Button 
              onClick={handleDiarySubmit}
              disabled={!diaryEntry.trim() || isAnalyzing}
              className="w-full"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              {isAnalyzing ? 'Analyzing...' : 'Save Entry'}
            </Button>
          </div>
        </Card>

        {/* Smart Insights */}
        {smartInsights && (
          <Card className="p-4">
            <div className="flex items-center space-x-3 mb-4">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-foreground">Smart Insights</h2>
            </div>
            
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium text-foreground">Organization Score</p>
                <p className="text-xs text-muted-foreground mt-1">
                  📊 Your vault organization score: {smartInsights.organizationScore}/100
                </p>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm font-medium text-foreground">Storage Analysis</p>
                <p className="text-xs text-muted-foreground mt-1">
                  💾 {smartInsights.totalFiles} files using {(smartInsights.storageUsed / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
              
              {smartInsights.duplicateFiles?.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm font-medium text-foreground">Duplicate Files</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    🔍 Found {smartInsights.duplicateFiles.length} duplicate files that can be cleaned up
                  </p>
                </div>
              )}
              
              {smartInsights.recommendations?.map((rec: string, index: number) => (
                <div key={index} className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm font-medium text-foreground">Recommendation</p>
                  <p className="text-xs text-muted-foreground mt-1">💡 {rec}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AIFeatures;
