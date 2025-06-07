
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Camera, FileText, Mic, Settings, Sparkles, Shield, Eye } from 'lucide-react';
import { EnhancedAIService, AIConfig, DocumentOCRResult, NSFWDetectionResult } from '@/services/EnhancedAIService';
import { useToast } from '@/hooks/use-toast';

const EnhancedAIFeatures = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<AIConfig>({ openAIKey: '', googleCloudKey: '', anthropicKey: '', enabled: false });
  const [ocrResult, setOcrResult] = useState<DocumentOCRResult | null>(null);
  const [nsfwResult, setNsfwResult] = useState<NSFWDetectionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const aiService = EnhancedAIService.getInstance();

  useEffect(() => {
    initializeService();
  }, []);

  const initializeService = async () => {
    try {
      await aiService.initialize();
      const currentConfig = aiService.getConfig();
      setConfig(currentConfig);
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
    }
  };

  const handleConfigSave = async () => {
    try {
      await aiService.saveConfig(config);
      toast({
        title: "Configuration Saved",
        description: "AI services have been configured successfully",
      });
    } catch (error) {
      toast({
        title: "Configuration Failed",
        description: "Failed to save AI configuration",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setOcrResult(null);
      setNsfwResult(null);
    }
  };

  const performOCR = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = (e.target?.result as string).split(',')[1];
        const result = await aiService.performOCR(base64Data);
        setOcrResult(result);
        
        toast({
          title: "OCR Complete",
          description: `Extracted ${result.text.length} characters with ${(result.confidence * 100).toFixed(1)}% confidence`,
        });
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      toast({
        title: "OCR Failed",
        description: "Failed to extract text from image",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const performNSFWDetection = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = (e.target?.result as string).split(',')[1];
        const result = await aiService.enhancedNSFWDetection(base64Data);
        setNsfwResult(result);
        
        toast({
          title: "Content Analysis Complete",
          description: `Content safety rating: ${result.safetyRating}`,
        });
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze content safety",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getSafetyColor = (rating: string) => {
    switch (rating) {
      case 'VERY_UNLIKELY': return 'text-green-600';
      case 'UNLIKELY': return 'text-green-500';
      case 'POSSIBLE': return 'text-yellow-500';
      case 'LIKELY': return 'text-orange-500';
      case 'VERY_LIKELY': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <Brain className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold">Enhanced AI Features</h1>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config">
            <Settings className="w-4 h-4 mr-2" />
            Config
          </TabsTrigger>
          <TabsTrigger value="ocr">
            <FileText className="w-4 h-4 mr-2" />
            OCR
          </TabsTrigger>
          <TabsTrigger value="nsfw">
            <Shield className="w-4 h-4 mr-2" />
            Content Safety
          </TabsTrigger>
          <TabsTrigger value="categorization">
            <Sparkles className="w-4 h-4 mr-2" />
            Auto-Tag
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">AI Service Configuration</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">OpenAI API Key</label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={config.openAIKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, openAIKey: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Google Cloud API Key</label>
                <Input
                  type="password"
                  placeholder="AIza..."
                  value={config.googleCloudKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, googleCloudKey: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Anthropic API Key (Optional)</label>
                <Input
                  type="password"
                  placeholder="sk-ant-..."
                  value={config.anthropicKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, anthropicKey: e.target.value }))}
                />
              </div>
              <Button onClick={handleConfigSave} className="w-full">
                Save Configuration
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ocr">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Document OCR</h3>
            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="mb-4"
                />
                {selectedFile && (
                  <div className="mb-4">
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Selected file"
                      className="max-w-xs max-h-48 object-contain border rounded"
                    />
                  </div>
                )}
              </div>
              
              <Button 
                onClick={performOCR} 
                disabled={!selectedFile || isProcessing}
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                {isProcessing ? 'Processing...' : 'Extract Text'}
              </Button>

              {ocrResult && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">
                      Confidence: {(ocrResult.confidence * 100).toFixed(1)}%
                    </Badge>
                    <Badge variant="outline">
                      Language: {ocrResult.language}
                    </Badge>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Extracted Text:</h4>
                    <Textarea
                      value={ocrResult.text}
                      readOnly
                      rows={8}
                      className="font-mono text-sm"
                    />
                  </div>

                  {ocrResult.words.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Word Analysis:</h4>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {ocrResult.words.slice(0, 20).map((word, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <span className="font-mono">{word.text}</span>
                            <Badge variant="secondary" className="text-xs">
                              {(word.confidence * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="nsfw">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Content Safety Analysis</h3>
            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="mb-4"
                />
                {selectedFile && (
                  <div className="mb-4">
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Selected file"
                      className="max-w-xs max-h-48 object-contain border rounded"
                    />
                  </div>
                )}
              </div>
              
              <Button 
                onClick={performNSFWDetection} 
                disabled={!selectedFile || isProcessing}
                className="w-full"
              >
                <Eye className="w-4 h-4 mr-2" />
                {isProcessing ? 'Analyzing...' : 'Analyze Content Safety'}
              </Button>

              {nsfwResult && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant={nsfwResult.isNSFW ? "destructive" : "secondary"}
                    >
                      {nsfwResult.isNSFW ? 'NSFW Content' : 'Safe Content'}
                    </Badge>
                    <Badge variant="outline">
                      Confidence: {(nsfwResult.confidence * 100).toFixed(1)}%
                    </Badge>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Safety Rating:</h4>
                    <div className={`text-lg font-semibold ${getSafetyColor(nsfwResult.safetyRating)}`}>
                      {nsfwResult.safetyRating.replace('_', ' ')}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Category Analysis:</h4>
                    <div className="space-y-2">
                      {Object.entries(nsfwResult.categories).map(([category, score]) => (
                        <div key={category} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize">{category}</span>
                            <span>{(score * 100).toFixed(1)}%</span>
                          </div>
                          <Progress value={score * 100} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="categorization">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">AI-Powered Auto-Categorization</h3>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Upload files to automatically categorize them using advanced AI analysis.
                The system will analyze content, suggest tags, and recommend organization actions.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <h4 className="font-medium">Document Analysis</h4>
                  <p className="text-sm text-muted-foreground">Extract and categorize document content</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Camera className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <h4 className="font-medium">Image Recognition</h4>
                  <p className="text-sm text-muted-foreground">Identify objects and scenes in images</p>
                </div>
              </div>

              <Button className="w-full">
                <Sparkles className="w-4 h-4 mr-2" />
                Enable Auto-Categorization
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedAIFeatures;
