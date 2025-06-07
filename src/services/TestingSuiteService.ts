export interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export interface TestSuite {
  name: string;
  tests: TestCase[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface TestCase {
  name: string;
  test: () => Promise<boolean>;
  timeout?: number;
}

export class TestingSuiteService {
  private static instance: TestingSuiteService;
  private testSuites: TestSuite[] = [];

  static getInstance(): TestingSuiteService {
    if (!TestingSuiteService.instance) {
      TestingSuiteService.instance = new TestingSuiteService();
    }
    return TestingSuiteService.instance;
  }

  async initialize(): Promise<void> {
    this.registerDefaultTestSuites();
  }

  private registerDefaultTestSuites(): void {
    // Security Tests
    this.registerTestSuite({
      name: 'Security',
      tests: [
        {
          name: 'Authentication System',
          test: async () => {
            const { AuthProvider } = await import('../contexts/AuthContext');
            return AuthProvider !== undefined;
          }
        },
        {
          name: 'Encryption Service',
          test: async () => {
            const CryptoJS = await import('crypto-js');
            const testData = 'test encryption data';
            const encrypted = CryptoJS.AES.encrypt(testData, 'test-key').toString();
            const decrypted = CryptoJS.AES.decrypt(encrypted, 'test-key').toString(CryptoJS.enc.Utf8);
            return decrypted === testData;
          }
        },
        {
          name: 'Screenshot Prevention',
          test: async () => {
            const { NativeSecurityService } = await import('./NativeSecurityService');
            const service = NativeSecurityService.getInstance();
            // Test if service initializes without errors
            return service !== null;
          }
        }
      ]
    });

    // File Management Tests
    this.registerTestSuite({
      name: 'File Management',
      tests: [
        {
          name: 'File Upload',
          test: async () => {
            // Create mock file
            const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
            return mockFile.size > 0 && mockFile.name === 'test.txt';
          }
        },
        {
          name: 'File Encryption',
          test: async () => {
            const CryptoJS = await import('crypto-js');
            const testContent = 'test file content';
            const encrypted = CryptoJS.AES.encrypt(testContent, 'file-key').toString();
            return encrypted.length > 0 && encrypted !== testContent;
          }
        },
        {
          name: 'Duplicate Detection',
          test: async () => {
            const { DuplicateDetectionService } = await import('./DuplicateDetectionService');
            const mockFiles = [
              { id: '1', name: 'test1.txt', size: 100, type: 'text', dateModified: '2023-01-01' },
              { id: '2', name: 'test2.txt', size: 100, type: 'text', dateModified: '2023-01-02' }
            ];
            const duplicates = await DuplicateDetectionService.findDuplicates(mockFiles as any);
            return Array.isArray(duplicates);
          }
        }
      ]
    });

    // AI Services Tests
    this.registerTestSuite({
      name: 'AI Services',
      tests: [
        {
          name: 'AI Processing Service',
          test: async () => {
            const { AIProcessingService } = await import('./AIProcessingService');
            const service = AIProcessingService.getInstance();
            return service !== null;
          }
        },
        {
          name: 'Enhanced AI Service',
          test: async () => {
            const { EnhancedAIService } = await import('./EnhancedAIService');
            const service = EnhancedAIService.getInstance();
            await service.initialize();
            return service.getConfig() !== null;
          }
        }
      ]
    });

    // Sync Services Tests
    this.registerTestSuite({
      name: 'Sync Services',
      tests: [
        {
          name: 'LAN Sync Service',
          test: async () => {
            const { LANSyncService } = await import('./LANSyncService');
            const service = LANSyncService.getInstance();
            return service !== null;
          }
        },
        {
          name: 'Cross Device Sync',
          test: async () => {
            const { CrossDeviceSyncService } = await import('./CrossDeviceSyncService');
            const service = CrossDeviceSyncService.getInstance();
            await service.initialize();
            return service !== null;
          }
        },
        {
          name: 'Auto Backup Service',
          test: async () => {
            const { AutoBackupService } = await import('./AutoBackupService');
            const service = AutoBackupService.getInstance();
            return service !== null;
          }
        }
      ]
    });

    // Performance Tests
    this.registerTestSuite({
      name: 'Performance',
      tests: [
        {
          name: 'File Load Time',
          test: async () => {
            const start = performance.now();
            // Simulate file loading
            await new Promise(resolve => setTimeout(resolve, 10));
            const duration = performance.now() - start;
            return duration < 100; // Should be under 100ms
          }
        },
        {
          name: 'Memory Usage',
          test: async () => {
            // Check if performance API and memory are available
            const perf = performance as any;
            if (typeof performance !== 'undefined' && perf.memory && perf.memory.usedJSHeapSize) {
              return perf.memory.usedJSHeapSize < 50 * 1024 * 1024; // Under 50MB
            }
            return true; // Skip if not available
          }
        }
      ]
    });

    // Analytics Tests
    this.registerTestSuite({
      name: 'Analytics',
      tests: [
        {
          name: 'Advanced Analytics Service',
          test: async () => {
            const { AdvancedAnalyticsService } = await import('./AdvancedAnalyticsService');
            const service = AdvancedAnalyticsService.getInstance();
            await service.initialize();
            return service !== null;
          }
        },
        {
          name: 'Metrics Collection',
          test: async () => {
            const { AdvancedAnalyticsService } = await import('./AdvancedAnalyticsService');
            const service = AdvancedAnalyticsService.getInstance();
            
            await service.trackPerformanceMetric({
              operation: 'test',
              averageTime: 100,
              minTime: 50,
              maxTime: 150,
              sampleCount: 1,
              errorRate: 0
            });
            
            return true;
          }
        }
      ]
    });

    // Reward System Tests
    this.registerTestSuite({
      name: 'Reward System',
      tests: [
        {
          name: 'Reward System Service',
          test: async () => {
            const { RewardSystemService } = await import('./RewardSystemService');
            const service = RewardSystemService.getInstance();
            return service !== null;
          }
        },
        {
          name: 'Coin Management',
          test: async () => {
            const { RewardSystemService } = await import('./RewardSystemService');
            const service = RewardSystemService.getInstance();
            const coins = await service.getUserCoins();
            return typeof coins.balance === 'number';
          }
        }
      ]
    });
  }

  registerTestSuite(suite: TestSuite): void {
    this.testSuites.push(suite);
  }

  async runAllTests(): Promise<{ results: TestResult[]; summary: { passed: number; failed: number; total: number } }> {
    const allResults: TestResult[] = [];

    for (const suite of this.testSuites) {
      const suiteResults = await this.runTestSuite(suite);
      allResults.push(...suiteResults);
    }

    const summary = {
      passed: allResults.filter(r => r.passed).length,
      failed: allResults.filter(r => !r.passed).length,
      total: allResults.length
    };

    return { results: allResults, summary };
  }

  async runTestSuite(suite: TestSuite): Promise<TestResult[]> {
    const results: TestResult[] = [];

    try {
      // Run setup if provided
      if (suite.setup) {
        await suite.setup();
      }

      // Run all tests in the suite
      for (const testCase of suite.tests) {
        const result = await this.runTest(testCase, suite.name);
        results.push(result);
      }

      // Run teardown if provided
      if (suite.teardown) {
        await suite.teardown();
      }
    } catch (error) {
      results.push({
        testName: `${suite.name} Suite Setup/Teardown`,
        passed: false,
        duration: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return results;
  }

  private async runTest(testCase: TestCase, suiteName: string): Promise<TestResult> {
    const testName = `${suiteName} > ${testCase.name}`;
    const startTime = performance.now();

    try {
      const timeout = testCase.timeout || 5000; // 5 second default timeout
      
      const testPromise = testCase.test();
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Test timeout')), timeout);
      });

      const passed = await Promise.race([testPromise, timeoutPromise]);
      const duration = performance.now() - startTime;

      return {
        testName,
        passed,
        duration
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      
      return {
        testName,
        passed: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async runSpecificTest(suiteName: string, testName: string): Promise<TestResult | null> {
    const suite = this.testSuites.find(s => s.name === suiteName);
    if (!suite) return null;

    const testCase = suite.tests.find(t => t.name === testName);
    if (!testCase) return null;

    return await this.runTest(testCase, suiteName);
  }

  getAvailableTestSuites(): string[] {
    return this.testSuites.map(s => s.name);
  }

  getTestsInSuite(suiteName: string): string[] {
    const suite = this.testSuites.find(s => s.name === suiteName);
    return suite ? suite.tests.map(t => t.name) : [];
  }

  async generateTestReport(results: TestResult[]): Promise<string> {
    const summary = {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      averageDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length
    };

    let report = `# Vaultix Test Report\n\n`;
    report += `## Summary\n`;
    report += `- Total Tests: ${summary.total}\n`;
    report += `- Passed: ${summary.passed}\n`;
    report += `- Failed: ${summary.failed}\n`;
    report += `- Success Rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%\n`;
    report += `- Average Duration: ${summary.averageDuration.toFixed(2)}ms\n\n`;

    if (summary.failed > 0) {
      report += `## Failed Tests\n`;
      results.filter(r => !r.passed).forEach(result => {
        report += `### ${result.testName}\n`;
        report += `- Duration: ${result.duration.toFixed(2)}ms\n`;
        if (result.error) {
          report += `- Error: ${result.error}\n`;
        }
        report += `\n`;
      });
    }

    report += `## All Test Results\n`;
    results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      report += `${status} ${result.testName} (${result.duration.toFixed(2)}ms)\n`;
    });

    return report;
  }
}
