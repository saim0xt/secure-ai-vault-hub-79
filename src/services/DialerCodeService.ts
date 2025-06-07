
import { NativeSecurityService } from './NativeSecurityService';
import { Preferences } from '@capacitor/preferences';

export interface DialerCode {
  id: string;
  code: string;
  action: 'launch_vault' | 'launch_fake' | 'emergency_wipe' | 'stealth_toggle' | 'backup_now';
  description: string;
  enabled: boolean;
  requireConfirmation: boolean;
  lastUsed?: string;
  useCount: number;
}

export class DialerCodeService {
  private static instance: DialerCodeService;
  private codes: DialerCode[] = [];
  private nativeSecurity = NativeSecurityService.getInstance();

  static getInstance(): DialerCodeService {
    if (!DialerCodeService.instance) {
      DialerCodeService.instance = new DialerCodeService();
    }
    return DialerCodeService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.loadCodes();
      await this.setupDefaultCodes();
      await this.registerDialerListener();
      console.log('Dialer code service initialized');
    } catch (error) {
      console.error('Failed to initialize dialer code service:', error);
    }
  }

  private async setupDefaultCodes(): Promise<void> {
    if (this.codes.length === 0) {
      const defaultCodes: DialerCode[] = [
        {
          id: 'launch_real',
          code: '*#1337#*',
          action: 'launch_vault',
          description: 'Launch Real Vault',
          enabled: true,
          requireConfirmation: false,
          useCount: 0
        },
        {
          id: 'launch_fake',
          code: '*#0000#*',
          action: 'launch_fake',
          description: 'Launch Fake Vault',
          enabled: true,
          requireConfirmation: false,
          useCount: 0
        },
        {
          id: 'stealth_mode',
          code: '*#9999#*',
          action: 'stealth_toggle',
          description: 'Toggle Stealth Mode',
          enabled: true,
          requireConfirmation: true,
          useCount: 0
        },
        {
          id: 'emergency_wipe',
          code: '*#666666#*',
          action: 'emergency_wipe',
          description: 'Emergency Data Wipe',
          enabled: false,
          requireConfirmation: true,
          useCount: 0
        },
        {
          id: 'backup_now',
          code: '*#2580#*',
          action: 'backup_now',
          description: 'Trigger Immediate Backup',
          enabled: true,
          requireConfirmation: false,
          useCount: 0
        }
      ];

      this.codes = defaultCodes;
      await this.saveCodes();
    }
  }

  private async registerDialerListener(): Promise<void> {
    try {
      // Listen for phone state changes to detect dialer codes
      document.addEventListener('dialercode', this.handleDialerCode.bind(this));
      
      // Register with native layer
      await this.nativeSecurity.executeDialerCode('register');
      
      console.log('Dialer listener registered');
    } catch (error) {
      console.error('Failed to register dialer listener:', error);
    }
  }

  private async handleDialerCode(event: any): Promise<void> {
    const dialedCode = event.detail?.code;
    if (!dialedCode) return;

    const matchingCode = this.codes.find(code => 
      code.enabled && code.code === dialedCode
    );

    if (matchingCode) {
      await this.executeAction(matchingCode);
    }
  }

  async executeAction(code: DialerCode): Promise<boolean> {
    try {
      console.log(`Executing dialer action: ${code.action}`);

      // Update usage stats
      code.useCount++;
      code.lastUsed = new Date().toISOString();
      await this.saveCodes();

      // Show confirmation if required
      if (code.requireConfirmation) {
        const confirmed = await this.showConfirmationDialog(code);
        if (!confirmed) return false;
      }

      // Execute the action
      switch (code.action) {
        case 'launch_vault':
          await this.launchRealVault();
          break;
        case 'launch_fake':
          await this.launchFakeVault();
          break;
        case 'emergency_wipe':
          await this.performEmergencyWipe();
          break;
        case 'stealth_toggle':
          await this.toggleStealthMode();
          break;
        case 'backup_now':
          await this.triggerBackup();
          break;
        default:
          console.warn('Unknown dialer action:', code.action);
          return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to execute dialer action:', error);
      return false;
    }
  }

  private async showConfirmationDialog(code: DialerCode): Promise<boolean> {
    return new Promise((resolve) => {
      const confirmed = window.confirm(
        `Execute ${code.description}?\n\nThis action cannot be undone.`
      );
      resolve(confirmed);
    });
  }

  private async launchRealVault(): Promise<void> {
    // Remove fake vault flag and redirect to real vault
    localStorage.removeItem('vaultix_fake_vault_mode');
    localStorage.removeItem('vaultix_stealth_mode');
    window.location.href = '/auth?mode=real';
  }

  private async launchFakeVault(): Promise<void> {
    // Set fake vault flag and redirect
    localStorage.setItem('vaultix_fake_vault_mode', 'true');
    window.location.href = '/auth?mode=fake';
  }

  private async toggleStealthMode(): Promise<void> {
    const currentMode = localStorage.getItem('vaultix_stealth_mode') === 'true';
    const newMode = !currentMode;
    
    localStorage.setItem('vaultix_stealth_mode', newMode.toString());
    
    if (newMode) {
      await this.nativeSecurity.enableStealthMode();
    } else {
      await this.nativeSecurity.disableStealthMode();
    }
    
    // Show confirmation
    const message = newMode ? 'Stealth mode enabled' : 'Stealth mode disabled';
    alert(message);
  }

  private async performEmergencyWipe(): Promise<void> {
    try {
      // Clear all local data
      localStorage.clear();
      sessionStorage.clear();
      await Preferences.clear();
      
      // Trigger native wipe if available
      await this.nativeSecurity.triggerSelfDestruct('CONFIRMED');
      
      // Redirect to setup
      window.location.href = '/auth?wiped=true';
    } catch (error) {
      console.error('Emergency wipe failed:', error);
      alert('Emergency wipe failed. Please manually uninstall the app.');
    }
  }

  private async triggerBackup(): Promise<void> {
    try {
      // Import backup service dynamically to avoid circular dependencies
      const { AutoBackupService } = await import('./AutoBackupService');
      const backupService = AutoBackupService.getInstance();
      
      // Find first enabled schedule and execute it
      const schedules = backupService.getSchedules();
      const activeSchedule = schedules.find(s => s.enabled);
      
      if (activeSchedule) {
        await backupService.executeBackup(activeSchedule.id);
        alert('Backup started successfully');
      } else {
        alert('No active backup schedule found');
      }
    } catch (error) {
      console.error('Failed to trigger backup:', error);
      alert('Backup failed to start');
    }
  }

  async createCode(code: Omit<DialerCode, 'id' | 'useCount'>): Promise<string> {
    const id = `code_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newCode: DialerCode = {
      ...code,
      id,
      useCount: 0
    };

    this.codes.push(newCode);
    await this.saveCodes();

    return id;
  }

  async updateCode(id: string, updates: Partial<DialerCode>): Promise<boolean> {
    const index = this.codes.findIndex(c => c.id === id);
    if (index === -1) return false;

    this.codes[index] = { ...this.codes[index], ...updates };
    await this.saveCodes();

    return true;
  }

  async deleteCode(id: string): Promise<boolean> {
    const index = this.codes.findIndex(c => c.id === id);
    if (index === -1) return false;

    this.codes.splice(index, 1);
    await this.saveCodes();

    return true;
  }

  getCodes(): DialerCode[] {
    return [...this.codes];
  }

  async testCode(code: string): Promise<boolean> {
    const matchingCode = this.codes.find(c => c.code === code);
    if (matchingCode) {
      console.log('Dialer code test successful:', matchingCode.description);
      return true;
    }
    return false;
  }

  private async loadCodes(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_dialer_codes' });
      if (value) {
        this.codes = JSON.parse(value);
      }
    } catch (error) {
      console.error('Failed to load dialer codes:', error);
    }
  }

  private async saveCodes(): Promise<void> {
    try {
      await Preferences.set({
        key: 'vaultix_dialer_codes',
        value: JSON.stringify(this.codes)
      });
    } catch (error) {
      console.error('Failed to save dialer codes:', error);
    }
  }
}
