import { Preferences } from '@capacitor/preferences';
import { Device } from '@capacitor/device';

export interface AnalyticsData {
  fileOperations: FileOperation[];
  usagePatterns: UsagePattern[];
  securityEvents: SecurityEvent[];
  performanceMetrics: PerformanceMetric[];
  userBehavior: UserBehaviorData;
}

export interface FileOperation {
  type: 'create' | 'read' | 'update' | 'delete' | 'move' | 'copy';
  fileId: string;
  fileName: string;
  fileType: string;
  timestamp: string;
  duration: number;
  success: boolean;
}

export interface UsagePattern {
  date: string;
  activeTime: number;
  filesAccessed: number;
  operationsPerformed: number;
  mostUsedFeatures: string[];
  peakUsageHour: number;
}

export interface SecurityEvent {
  type: 'login_attempt' | 'break_in' | 'pattern_fail' | 'volume_trigger' | 'background_breach';
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  resolved: boolean;
}

export interface PerformanceMetric {
  operation: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  sampleCount: number;
  errorRate: number;
  timestamp: string;
}

export interface UserBehaviorData {
  loginFrequency: number;
  sessionDuration: number;
  preferredFileTypes: string[];
  organizationScore: number;
  securityScore: number;
  productivityScore: number;
}

export interface InsightRecommendation {
  id: string;
  type: 'security' | 'productivity' | 'organization' | 'performance';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  actionItems: string[];
  impact: string;
  timeframe: string;
}

export class AdvancedAnalyticsService {
  private static instance: AdvancedAnalyticsService;
  private analyticsBuffer: any[] = [];
  private metricsCollectionInterval: NodeJS.Timeout | null = null;

  static getInstance(): AdvancedAnalyticsService {
    if (!AdvancedAnalyticsService.instance) {
      AdvancedAnalyticsService.instance = new AdvancedAnalyticsService();
    }
    return AdvancedAnalyticsService.instance;
  }

  async initialize(): Promise<void> {
    await this.startMetricsCollection();
    await this.scheduleAnalysis();
  }

  async trackFileOperation(operation: Omit<FileOperation, 'timestamp'>): Promise<void> {
    const fileOp: FileOperation = {
      ...operation,
      timestamp: new Date().toISOString()
    };

    try {
      const { value } = await Preferences.get({ key: 'vaultix_file_operations' });
      const operations: FileOperation[] = value ? JSON.parse(value) : [];
      operations.push(fileOp);

      // Keep only last 1000 operations
      if (operations.length > 1000) {
        operations.splice(0, operations.length - 1000);
      }

      await Preferences.set({ key: 'vaultix_file_operations', value: JSON.stringify(operations) });
    } catch (error) {
      console.error('Failed to track file operation:', error);
    }
  }

  async trackSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): Promise<void> {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    try {
      const { value } = await Preferences.get({ key: 'vaultix_security_events' });
      const events: SecurityEvent[] = value ? JSON.parse(value) : [];
      events.push(securityEvent);

      // Keep only last 500 events
      if (events.length > 500) {
        events.splice(0, events.length - 500);
      }

      await Preferences.set({ key: 'vaultix_security_events', value: JSON.stringify(events) });
    } catch (error) {
      console.error('Failed to track security event:', error);
    }
  }

  async trackPerformanceMetric(metric: Omit<PerformanceMetric, 'timestamp'>): Promise<void> {
    const performanceMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date().toISOString()
    };

    this.analyticsBuffer.push(performanceMetric);

    // Flush buffer every 10 metrics
    if (this.analyticsBuffer.length >= 10) {
      await this.flushAnalyticsBuffer();
    }
  }

  private async flushAnalyticsBuffer(): Promise<void> {
    if (this.analyticsBuffer.length === 0) return;

    try {
      const { value } = await Preferences.get({ key: 'vaultix_performance_metrics' });
      const metrics: PerformanceMetric[] = value ? JSON.parse(value) : [];
      metrics.push(...this.analyticsBuffer);

      // Keep only last 500 metrics
      if (metrics.length > 500) {
        metrics.splice(0, metrics.length - 500);
      }

      await Preferences.set({ key: 'vaultix_performance_metrics', value: JSON.stringify(metrics) });
      this.analyticsBuffer = [];
    } catch (error) {
      console.error('Failed to flush analytics buffer:', error);
    }
  }

  async generateAdvancedInsights(): Promise<InsightRecommendation[]> {
    try {
      const analyticsData = await this.getAnalyticsData();
      const recommendations: InsightRecommendation[] = [];

      // Security insights
      const securityInsights = this.analyzeSecurityPatterns(analyticsData.securityEvents);
      recommendations.push(...securityInsights);

      // Performance insights
      const performanceInsights = this.analyzePerformancePatterns(analyticsData.performanceMetrics);
      recommendations.push(...performanceInsights);

      // Usage insights
      const usageInsights = this.analyzeUsagePatterns(analyticsData.fileOperations);
      recommendations.push(...usageInsights);

      // Organization insights
      const organizationInsights = this.analyzeOrganizationPatterns(analyticsData.fileOperations);
      recommendations.push(...organizationInsights);

      return recommendations.sort((a, b) => {
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      });
    } catch (error) {
      console.error('Failed to generate insights:', error);
      return [];
    }
  }

  private analyzeSecurityPatterns(events: SecurityEvent[]): InsightRecommendation[] {
    const recommendations: InsightRecommendation[] = [];

    // Analyze failed login attempts
    const failedLogins = events.filter(e => e.type === 'login_attempt' && !e.resolved);
    if (failedLogins.length > 5) {
      recommendations.push({
        id: 'security_failed_logins',
        type: 'security',
        priority: 'high',
        title: 'Multiple Failed Login Attempts Detected',
        description: `${failedLogins.length} failed login attempts in recent activity`,
        actionItems: [
          'Review break-in logs',
          'Consider enabling biometric authentication',
          'Update authentication pattern'
        ],
        impact: 'Prevents unauthorized access',
        timeframe: 'Immediate'
      });
    }

    // Analyze break-in attempts
    const breakIns = events.filter(e => e.type === 'break_in');
    if (breakIns.length > 0) {
      recommendations.push({
        id: 'security_break_ins',
        type: 'security',
        priority: 'high',
        title: 'Break-in Attempts Detected',
        description: `${breakIns.length} unauthorized access attempts detected`,
        actionItems: [
          'Review security footage',
          'Enable self-destruct mode',
          'Add additional security layers'
        ],
        impact: 'Critical security threat',
        timeframe: 'Immediate'
      });
    }

    return recommendations;
  }

  private analyzePerformancePatterns(metrics: PerformanceMetric[]): InsightRecommendation[] {
    const recommendations: InsightRecommendation[] = [];

    // Analyze slow operations
    const slowOperations = metrics.filter(m => m.averageTime > 2000); // > 2 seconds
    if (slowOperations.length > 0) {
      recommendations.push({
        id: 'performance_slow_ops',
        type: 'performance',
        priority: 'medium',
        title: 'Slow Operations Detected',
        description: `${slowOperations.length} operations are performing slowly`,
        actionItems: [
          'Clear cache and temporary files',
          'Optimize file storage',
          'Consider upgrading device'
        ],
        impact: 'Improves app responsiveness',
        timeframe: '1-2 days'
      });
    }

    // Analyze error rates
    const highErrorOps = metrics.filter(m => m.errorRate > 0.1); // > 10% error rate
    if (highErrorOps.length > 0) {
      recommendations.push({
        id: 'performance_high_errors',
        type: 'performance',
        priority: 'high',
        title: 'High Error Rates Detected',
        description: `${highErrorOps.length} operations have high failure rates`,
        actionItems: [
          'Check storage space',
          'Verify file integrity',
          'Update app to latest version'
        ],
        impact: 'Prevents data loss and corruption',
        timeframe: 'Immediate'
      });
    }

    return recommendations;
  }

  private analyzeUsagePatterns(operations: FileOperation[]): InsightRecommendation[] {
    const recommendations: InsightRecommendation[] = [];

    // Analyze file access patterns
    const fileAccess = operations.filter(op => op.type === 'read');
    const accessFrequency = new Map<string, number>();
    
    fileAccess.forEach(op => {
      accessFrequency.set(op.fileId, (accessFrequency.get(op.fileId) || 0) + 1);
    });

    const frequentlyAccessed = Array.from(accessFrequency.entries())
      .filter(([_, count]) => count > 10)
      .sort((a, b) => b[1] - a[1]);

    if (frequentlyAccessed.length > 5) {
      recommendations.push({
        id: 'usage_frequent_access',
        type: 'productivity',
        priority: 'medium',
        title: 'Create Quick Access for Frequent Files',
        description: `${frequentlyAccessed.length} files are accessed frequently`,
        actionItems: [
          'Add frequent files to favorites',
          'Create quick access shortcuts',
          'Organize into dedicated folders'
        ],
        impact: 'Faster file access and improved productivity',
        timeframe: '1 week'
      });
    }

    return recommendations;
  }

  private analyzeOrganizationPatterns(operations: FileOperation[]): InsightRecommendation[] {
    const recommendations: InsightRecommendation[] = [];

    // Analyze unorganized files
    const createdFiles = operations.filter(op => op.type === 'create');
    const totalFiles = createdFiles.length;
    
    if (totalFiles > 50) {
      recommendations.push({
        id: 'organization_file_management',
        type: 'organization',
        priority: 'medium',
        title: 'Improve File Organization',
        description: `${totalFiles} files could benefit from better organization`,
        actionItems: [
          'Create folder structure',
          'Use AI auto-tagging',
          'Regular cleanup sessions'
        ],
        impact: 'Easier file discovery and management',
        timeframe: '1-2 weeks'
      });
    }

    return recommendations;
  }

  async getUserBehaviorScore(): Promise<UserBehaviorData> {
    try {
      const analyticsData = await this.getAnalyticsData();
      
      const loginFrequency = this.calculateLoginFrequency(analyticsData.securityEvents);
      const sessionDuration = this.calculateSessionDuration(analyticsData.fileOperations);
      const preferredFileTypes = this.calculatePreferredFileTypes(analyticsData.fileOperations);
      const organizationScore = this.calculateOrganizationScore(analyticsData.fileOperations);
      const securityScore = this.calculateSecurityScore(analyticsData.securityEvents);
      const productivityScore = this.calculateProductivityScore(analyticsData.fileOperations);

      return {
        loginFrequency,
        sessionDuration,
        preferredFileTypes,
        organizationScore,
        securityScore,
        productivityScore
      };
    } catch (error) {
      console.error('Failed to calculate user behavior score:', error);
      return {
        loginFrequency: 0,
        sessionDuration: 0,
        preferredFileTypes: [],
        organizationScore: 0,
        securityScore: 0,
        productivityScore: 0
      };
    }
  }

  private async getAnalyticsData(): Promise<AnalyticsData> {
    const [fileOps, securityEvents, perfMetrics] = await Promise.all([
      Preferences.get({ key: 'vaultix_file_operations' }).then(r => r.value ? JSON.parse(r.value) : []),
      Preferences.get({ key: 'vaultix_security_events' }).then(r => r.value ? JSON.parse(r.value) : []),
      Preferences.get({ key: 'vaultix_performance_metrics' }).then(r => r.value ? JSON.parse(r.value) : [])
    ]);

    return {
      fileOperations: fileOps,
      usagePatterns: [],
      securityEvents,
      performanceMetrics: perfMetrics,
      userBehavior: await this.getUserBehaviorScore()
    };
  }

  private calculateLoginFrequency(events: SecurityEvent[]): number {
    const logins = events.filter(e => e.type === 'login_attempt' && e.resolved);
    const days = 7; // Last 7 days
    return logins.length / days;
  }

  private calculateSessionDuration(operations: FileOperation[]): number {
    if (operations.length === 0) return 0;
    
    const totalDuration = operations.reduce((sum, op) => sum + op.duration, 0);
    return totalDuration / operations.length;
  }

  private calculatePreferredFileTypes(operations: FileOperation[]): string[] {
    const typeCount = new Map<string, number>();
    
    operations.forEach(op => {
      const type = op.fileType.split('/')[0];
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    });

    return Array.from(typeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type, _]) => type);
  }

  private calculateOrganizationScore(operations: FileOperation[]): number {
    // Score based on file organization patterns
    const createOps = operations.filter(op => op.type === 'create');
    const moveOps = operations.filter(op => op.type === 'move');
    
    if (createOps.length === 0) return 100;
    
    const organizationRatio = moveOps.length / createOps.length;
    return Math.min(100, organizationRatio * 100);
  }

  private calculateSecurityScore(events: SecurityEvent[]): number {
    const totalEvents = events.length;
    if (totalEvents === 0) return 100;
    
    const criticalEvents = events.filter(e => e.severity === 'critical').length;
    const highEvents = events.filter(e => e.severity === 'high').length;
    
    const securityIssues = criticalEvents * 3 + highEvents * 2;
    return Math.max(0, 100 - (securityIssues / totalEvents) * 100);
  }

  private calculateProductivityScore(operations: FileOperation[]): number {
    const successful = operations.filter(op => op.success).length;
    const total = operations.length;
    
    if (total === 0) return 100;
    return (successful / total) * 100;
  }

  private async startMetricsCollection(): Promise<void> {
    this.metricsCollectionInterval = setInterval(async () => {
      await this.flushAnalyticsBuffer();
    }, 30000); // Flush every 30 seconds
  }

  private async scheduleAnalysis(): Promise<void> {
    // Schedule daily analysis
    setInterval(async () => {
      const insights = await this.generateAdvancedInsights();
      console.log('Generated insights:', insights.length);
    }, 24 * 60 * 60 * 1000); // Daily
  }

  async exportAnalyticsData(): Promise<string> {
    try {
      const data = await this.getAnalyticsData();
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Failed to export analytics:', error);
      throw error;
    }
  }
}
