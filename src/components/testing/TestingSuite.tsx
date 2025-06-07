
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TestTube, Play, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import { TestingSuiteService, TestResult } from '@/services/TestingSuiteService';
import { useToast } from '@/hooks/use-toast';

const TestingSuite = () => {
  const { toast } = useToast();
  const [testSuites, setTestSuites] = useState<string[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<string>('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [testReport, setTestReport] = useState<string>('');

  const testingService = TestingSuiteService.getInstance();

  useEffect(() => {
    initializeService();
  }, []);

  const initializeService = async () => {
    try {
      await testingService.initialize();
      const suites = testingService.getAvailableTestSuites();
      setTestSuites(suites);
      if (suites.length > 0) {
        setSelectedSuite(suites[0]);
      }
    } catch (error) {
      console.error('Failed to initialize testing service:', error);
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setTestResults([]);

    try {
      const { results, summary } = await testingService.runAllTests();
      setTestResults(results);
      
      const report = await testingService.generateTestReport(results);
      setTestReport(report);

      toast({
        title: "Tests Complete",
        description: `${summary.passed}/${summary.total} tests passed`,
        variant: summary.failed === 0 ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Testing Failed",
        description: "Failed to run test suite",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
      setProgress(100);
    }
  };

  const runSuiteTests = async (suiteName: string) => {
    setIsRunning(true);
    setProgress(0);

    try {
      const suite = testingService['testSuites'].find((s: any) => s.name === suiteName);
      if (suite) {
        const results = await testingService.runTestSuite(suite);
        setTestResults(prev => [...prev.filter(r => !r.testName.startsWith(suiteName)), ...results]);
      }

      toast({
        title: "Suite Complete",
        description: `${suiteName} tests finished`,
      });
    } catch (error) {
      toast({
        title: "Suite Failed",
        description: `Failed to run ${suiteName} tests`,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const downloadReport = () => {
    if (!testReport) return;

    const blob = new Blob([testReport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vaultix-test-report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getResultIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getSuccessRate = () => {
    if (testResults.length === 0) return 0;
    const passed = testResults.filter(r => r.passed).length;
    return (passed / testResults.length) * 100;
  };

  const groupResultsBySuite = () => {
    const grouped = testResults.reduce((acc, result) => {
      const suiteName = result.testName.split(' > ')[0];
      if (!acc[suiteName]) {
        acc[suiteName] = [];
      }
      acc[suiteName].push(result);
      return acc;
    }, {} as Record<string, TestResult[]>);

    return grouped;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <TestTube className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold">Testing Suite</h1>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Test Controls */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Test Controls</h3>
              <div className="space-y-4">
                <Button 
                  onClick={runAllTests} 
                  disabled={isRunning}
                  className="w-full"
                  size="lg"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isRunning ? 'Running Tests...' : 'Run All Tests'}
                </Button>

                {isRunning && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className="font-medium">Test Suites:</h4>
                  <div className="space-y-2">
                    {testSuites.map(suite => (
                      <div key={suite} className="flex items-center justify-between">
                        <span className="text-sm">{suite}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => runSuiteTests(suite)}
                          disabled={isRunning}
                        >
                          Run
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            {/* Test Summary */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Test Summary</h3>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">
                    {getSuccessRate().toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Success Rate</div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-semibold text-green-600">
                      {testResults.filter(r => r.passed).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Passed</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-red-600">
                      {testResults.filter(r => !r.passed).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div>
                    <div className="text-xl font-semibold">
                      {testResults.length}
                    </div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>

                {testResults.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Progress</span>
                      <span>{testResults.length} tests</span>
                    </div>
                    <Progress value={getSuccessRate()} />
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="results">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Test Results</h3>
              {testResults.length > 0 && (
                <Button onClick={downloadReport} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              )}
            </div>

            {testResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No test results yet. Run tests to see results here.
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupResultsBySuite()).map(([suiteName, results]) => (
                  <div key={suiteName} className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{suiteName}</h4>
                      <Badge variant="outline">
                        {results.filter(r => r.passed).length}/{results.length}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1">
                      {results.map((result, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 border rounded-lg"
                        >
                          <div className="flex items-center space-x-2">
                            {getResultIcon(result.passed)}
                            <span className="text-sm">{result.testName.split(' > ')[1]}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{result.duration.toFixed(1)}ms</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="report">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Test Report</h3>
              {testReport && (
                <Button onClick={downloadReport} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download Markdown
                </Button>
              )}
            </div>

            {testReport ? (
              <Textarea
                value={testReport}
                readOnly
                rows={20}
                className="font-mono text-sm"
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No test report available. Run tests to generate a report.
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TestingSuite;
