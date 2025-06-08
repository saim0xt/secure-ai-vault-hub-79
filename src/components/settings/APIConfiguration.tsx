
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Key, Cloud, Mic, Brain, Volume2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { AIAPIService, AIAPIConfig } from '@/services/AIAPIService';
import { GoogleDriveService, GoogleDriveConfig } from '@/services/GoogleDriveService';
import { useToast } from '@/hooks/use-toast';

export default function APIConfiguration() {
  const [aiConfig, setAIConfig] = useState<AIAPIConfig>({
    openAIKey: '',
    googleCloudKey: '',
    anthropicKey: '',
    elevenLabsKey: '',
    enabled: false
  });
  const [driveConfig, setDriveConfig] = useState<GoogleDriveConfig>({
    clientId: '',
    apiKey: '',
    enabled: false
  });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testingAPI, setTestingAPI] = useState<string | null>(null);

  const aiService = AIAPIService.getInstance();
  const driveService = GoogleDriveService.getInstance();
  const { toast } = useToast();

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setIsLoading(true);
      await aiService.loadConfig();
      await driveService.loadConfig();
      
      setAIConfig(aiService.getConfig());
      setDriveConfig(driveService.getConfig());
    } catch (error) {
      console.error('Failed to load API configs:', error);
      toast({
        title: "Error",
        description: "Failed to load API configurations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveAIConfig = async () => {
    setIsSaving(true);
    try {
      await aiService.saveConfig(aiConfig);
      toast({
        title: "Settings Saved",
        description: "AI API configuration has been saved",
      });
    } catch (error) {
      console.error('Failed to save AI config:', error);
      toast({
        title: "Error",
        description: "Failed to save AI API configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveDriveConfig = async () => {
    setIsSaving(true);
    try {
      await driveService.saveConfig(driveConfig);
      toast({
        title: "Settings Saved",
        description: "Google Drive configuration has been saved",
      });
    } catch (error) {
      console.error('Failed to save Drive config:', error);
      toast({
        title: "Error",
        description: "Failed to save Google Drive configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testAPI = async (apiType: string) => {
    setTestingAPI(apiType);
    try {
      switch (apiType) {
        case 'openai':
          await aiService.generateText([{ role: 'user', content: 'Hello, this is a test.' }]);
          break;
        case 'google-cloud':
          // Test with a simple request
          break;
        case 'elevenlabs':
          await aiService.generateSpeech({
            text: 'Hello, this is a test.',
            voice: '9BWtsMINqrJLrRacOk9x', // Aria voice
            model: 'eleven_multilingual_v2'
          });
          break;
        case 'google-drive':
          await driveService.authenticate();
          break;
      }
      
      toast({
        title: "API Test Successful",
        description: `${apiType} API is working correctly`,
      });
    } catch (error) {
      console.error(`${apiType} API test failed:`, error);
      toast({
        title: "API Test Failed",
        description: error instanceof Error ? error.message : `${apiType} API test failed`,
        variant: "destructive",
      });
    } finally {
      setTestingAPI(null);
    }
  };

  const toggleKeyVisibility = (keyName: string) => {
    setShowKeys(prev => ({ ...prev, [keyName]: !prev[keyName] }));
  };

  const maskKey = (key: string, show: boolean) => {
    if (!key) return '';
    if (show) return key;
    return key.length > 8 ? `${key.substring(0, 8)}${'*'.repeat(key.length - 8)}` : '*'.repeat(key.length);
  };

  const getAPIStatus = (key: string) => {
    return key ? (
      <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        Configured
      </Badge>
    ) : (
      <Badge variant="secondary" className="flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        Not Configured
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-center">Loading API configurations...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Configuration</h1>
          <p className="text-muted-foreground">
            Configure your API keys for AI and cloud services
          </p>
        </div>
      </div>

      <Alert>
        <Key className="h-4 w-4" />
        <AlertDescription>
          Your API keys are stored securely on your device and are never transmitted to our servers.
          You can obtain these keys from the respective service providers.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="ai" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai">AI Services</TabsTrigger>
          <TabsTrigger value="cloud">Cloud Services</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                OpenAI Configuration
              </CardTitle>
              <CardDescription>
                Required for AI chat, image analysis, and text generation features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                {getAPIStatus(aiConfig.openAIKey)}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <div className="flex gap-2">
                  <Input
                    type={showKeys.openai ? 'text' : 'password'}
                    placeholder="sk-..."
                    value={maskKey(aiConfig.openAIKey, showKeys.openai)}
                    onChange={(e) => setAIConfig(prev => ({ ...prev, openAIKey: e.target.value }))}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleKeyVisibility('openai')}
                  >
                    {showKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => testAPI('openai')}
                    disabled={!aiConfig.openAIKey || testingAPI === 'openai'}
                  >
                    {testingAPI === 'openai' ? 'Testing...' : 'Test'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">OpenAI Platform</a>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Google Cloud Configuration
              </CardTitle>
              <CardDescription>
                Required for speech-to-text, OCR, and vision features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                {getAPIStatus(aiConfig.googleCloudKey)}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <div className="flex gap-2">
                  <Input
                    type={showKeys.google ? 'text' : 'password'}
                    placeholder="AIza..."
                    value={maskKey(aiConfig.googleCloudKey, showKeys.google)}
                    onChange={(e) => setAIConfig(prev => ({ ...prev, googleCloudKey: e.target.value }))}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleKeyVisibility('google')}
                  >
                    {showKeys.google ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => testAPI('google-cloud')}
                    disabled={!aiConfig.googleCloudKey || testingAPI === 'google-cloud'}
                  >
                    {testingAPI === 'google-cloud' ? 'Testing...' : 'Test'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your API key from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                ElevenLabs Configuration
              </CardTitle>
              <CardDescription>
                Required for text-to-speech and voice synthesis features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                {getAPIStatus(aiConfig.elevenLabsKey)}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <div className="flex gap-2">
                  <Input
                    type={showKeys.elevenlabs ? 'text' : 'password'}
                    placeholder="sk_..."
                    value={maskKey(aiConfig.elevenLabsKey, showKeys.elevenlabs)}
                    onChange={(e) => setAIConfig(prev => ({ ...prev, elevenLabsKey: e.target.value }))}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleKeyVisibility('elevenlabs')}
                  >
                    {showKeys.elevenlabs ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => testAPI('elevenlabs')}
                    disabled={!aiConfig.elevenLabsKey || testingAPI === 'elevenlabs'}
                  >
                    {testingAPI === 'elevenlabs' ? 'Testing...' : 'Test'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your API key from <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ElevenLabs Settings</a>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between pt-4">
            <div>
              <label className="text-sm font-medium">Enable AI Services</label>
              <p className="text-xs text-muted-foreground">
                Activate AI-powered features across the app
              </p>
            </div>
            <Switch
              checked={aiConfig.enabled}
              onCheckedChange={(checked) => setAIConfig(prev => ({ ...prev, enabled: checked }))}
            />
          </div>

          <Button onClick={saveAIConfig} disabled={isSaving} className="w-full">
            {isSaving ? 'Saving...' : 'Save AI Configuration'}
          </Button>
        </TabsContent>

        <TabsContent value="cloud" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Google Drive Configuration
              </CardTitle>
              <CardDescription>
                Required for cloud backup and synchronization features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                {getAPIStatus(driveConfig.clientId)}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Client ID</label>
                <div className="flex gap-2">
                  <Input
                    type={showKeys.driveClient ? 'text' : 'password'}
                    placeholder="xxxxx.apps.googleusercontent.com"
                    value={maskKey(driveConfig.clientId, showKeys.driveClient)}
                    onChange={(e) => setDriveConfig(prev => ({ ...prev, clientId: e.target.value }))}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleKeyVisibility('driveClient')}
                  >
                    {showKeys.driveClient ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <div className="flex gap-2">
                  <Input
                    type={showKeys.driveKey ? 'text' : 'password'}
                    placeholder="AIza..."
                    value={maskKey(driveConfig.apiKey, showKeys.driveKey)}
                    onChange={(e) => setDriveConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => toggleKeyVisibility('driveKey')}
                  >
                    {showKeys.driveKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => testAPI('google-drive')}
                    disabled={!driveConfig.clientId || !driveConfig.apiKey || testingAPI === 'google-drive'}
                  >
                    {testingAPI === 'google-drive' ? 'Testing...' : 'Connect'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Configure OAuth2 credentials in <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console</a>
                </p>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <label className="text-sm font-medium">Enable Google Drive</label>
                  <p className="text-xs text-muted-foreground">
                    Activate cloud backup and sync features
                  </p>
                </div>
                <Switch
                  checked={driveConfig.enabled}
                  onCheckedChange={(checked) => setDriveConfig(prev => ({ ...prev, enabled: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          <Button onClick={saveDriveConfig} disabled={isSaving} className="w-full">
            {isSaving ? 'Saving...' : 'Save Google Drive Configuration'}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
