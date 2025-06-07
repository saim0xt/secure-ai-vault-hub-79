
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Brain, BookOpen, Tags, Sparkles, Mic, Camera } from 'lucide-react';

const AIFeatures = () => {
  const navigate = useNavigate();
  const [diaryEntry, setDiaryEntry] = useState('');
  const [mood, setMood] = useState('');

  const aiFeatures = [
    {
      title: 'AI Diary',
      description: 'Smart journaling with mood analysis',
      icon: BookOpen,
      color: 'from-blue-500 to-purple-600',
      action: () => console.log('Open AI Diary'),
    },
    {
      title: 'Auto Tagging',
      description: 'Automatic file categorization',
      icon: Tags,
      color: 'from-green-500 to-blue-600',
      action: () => console.log('Auto tag files'),
    },
    {
      title: 'Smart Organization',
      description: 'AI-powered folder suggestions',
      icon: Sparkles,
      color: 'from-purple-500 to-pink-600',
    },
    {
      title: 'Voice Notes',
      description: 'Speech-to-text conversion',
      icon: Mic,
      color: 'from-orange-500 to-red-600',
    },
  ];

  const dailyPrompts = [
    "What made you smile today?",
    "Describe a challenge you overcame.",
    "What are you grateful for right now?",
    "How did you grow today?",
    "What's on your mind lately?",
  ];

  const handleDiarySubmit = () => {
    if (!diaryEntry.trim()) return;
    
    // Here you would save the diary entry and analyze mood
    console.log('Diary entry:', diaryEntry);
    console.log('Detected mood:', mood);
    
    setDiaryEntry('');
    setMood('');
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
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* AI Features Grid */}
        <div className="grid grid-cols-2 gap-4">
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
              placeholder="Write your thoughts here... The AI will analyze your mood and provide insights."
              value={diaryEntry}
              onChange={(e) => setDiaryEntry(e.target.value)}
              rows={4}
              className="resize-none"
            />
            
            {diaryEntry && (
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                  AI Mood Analysis:
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {diaryEntry.length > 20 
                    ? "Your entry suggests a reflective and thoughtful mood. Consider exploring these feelings further."
                    : "Write more to get detailed mood insights..."
                  }
                </p>
              </div>
            )}

            <Button 
              onClick={handleDiarySubmit}
              disabled={!diaryEntry.trim()}
              className="w-full"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Save Entry
            </Button>
          </div>
        </Card>

        {/* Smart Insights */}
        <Card className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-foreground">Smart Insights</h2>
          </div>
          
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium text-foreground">File Organization</p>
              <p className="text-xs text-muted-foreground mt-1">
                📊 Suggestion: Create "Work Documents" folder for better organization
              </p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium text-foreground">Storage Optimization</p>
              <p className="text-xs text-muted-foreground mt-1">
                🗄️ Found 3 duplicate images that can be safely removed
              </p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-sm font-medium text-foreground">Security Score</p>
              <p className="text-xs text-muted-foreground mt-1">
                🔐 Your vault security score: 85/100 (Very Good)
              </p>
            </div>
          </div>
        </Card>

        {/* Voice Notes */}
        <Card className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            <Mic className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-foreground">Voice Notes</h2>
          </div>
          
          <div className="text-center py-8">
            <Button className="w-32 h-32 rounded-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700">
              <Mic className="w-8 h-8 text-white" />
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Tap to start recording a voice note
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AIFeatures;
