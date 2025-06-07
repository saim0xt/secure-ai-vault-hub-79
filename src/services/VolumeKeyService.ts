
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export interface VolumeKeyPattern {
  id: string;
  name: string;
  sequence: ('up' | 'down')[];
  action: 'unlock' | 'emergency_lock' | 'panic_mode' | 'fake_vault';
  enabled: boolean;
}

export class VolumeKeyService {
  private static instance: VolumeKeyService;
  private isListening = false;
  private currentSequence: ('up' | 'down')[] = [];
  private sequenceTimeout: NodeJS.Timeout | null = null;
  private patterns: VolumeKeyPattern[] = [];
  private callbacks: Map<string, () => void> = new Map();

  static getInstance(): VolumeKeyService {
    if (!VolumeKeyService.instance) {
      VolumeKeyService.instance = new VolumeKeyService();
    }
    return VolumeKeyService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.loadPatterns();
      await this.setupDefaultPatterns();
      await this.startListening();
      console.log('Volume key service initialized');
    } catch (error) {
      console.error('Failed to initialize volume key service:', error);
    }
  }

  private async setupDefaultPatterns(): Promise<void> {
    const defaultPatterns: VolumeKeyPattern[] = [
      {
        id: 'emergency_lock',
        name: 'Emergency Lock',
        sequence: ['up', 'up', 'down', 'down'],
        action: 'emergency_lock',
        enabled: true
      },
      {
        id: 'panic_mode',
        name: 'Panic Mode',
        sequence: ['down', 'down', 'down', 'up', 'up'],
        action: 'panic_mode',
        enabled: true
      },
      {
        id: 'fake_vault',
        name: 'Switch to Fake Vault',
        sequence: ['up', 'down', 'up', 'down', 'up'],
        action: 'fake_vault',
        enabled: true
      },
      {
        id: 'quick_unlock',
        name: 'Quick Unlock',
        sequence: ['up', 'up', 'up'],
        action: 'unlock',
        enabled: false // Disabled by default for security
      }
    ];

    if (this.patterns.length === 0) {
      this.patterns = defaultPatterns;
      await this.savePatterns();
    }
  }

  async startListening(): Promise<void> {
    if (this.isListening) return;

    try {
      // Listen for volume button events
      document.addEventListener('volumeupbutton', this.handleVolumeUp.bind(this), false);
      document.addEventListener('volumedownbutton', this.handleVolumeDown.bind(this), false);
      
      this.isListening = true;
      console.log('Volume key listening started');
    } catch (error) {
      console.error('Failed to start volume key listening:', error);
    }
  }

  async stopListening(): Promise<void> {
    if (!this.isListening) return;

    try {
      document.removeEventListener('volumeupbutton', this.handleVolumeUp.bind(this), false);
      document.removeEventListener('volumedownbutton', this.handleVolumeDown.bind(this), false);
      
      this.isListening = false;
      this.currentSequence = [];
      
      if (this.sequenceTimeout) {
        clearTimeout(this.sequenceTimeout);
        this.sequenceTimeout = null;
      }
      
      console.log('Volume key listening stopped');
    } catch (error) {
      console.error('Failed to stop volume key listening:', error);
    }
  }

  private handleVolumeUp(): void {
    this.addToSequence('up');
  }

  private handleVolumeDown(): void {
    this.addToSequence('down');
  }

  private addToSequence(key: 'up' | 'down'): void {
    this.currentSequence.push(key);
    
    // Clear existing timeout
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
    }
    
    // Check for pattern matches
    this.checkPatterns();
    
    // Set timeout to reset sequence
    this.sequenceTimeout = setTimeout(() => {
      this.currentSequence = [];
    }, 3000); // 3 second timeout
    
    // Limit sequence length
    if (this.currentSequence.length > 10) {
      this.currentSequence = this.currentSequence.slice(-10);
    }
  }

  private checkPatterns(): void {
    for (const pattern of this.patterns) {
      if (!pattern.enabled) continue;
      
      if (this.sequenceMatches(this.currentSequence, pattern.sequence)) {
        this.executePattern(pattern);
        this.currentSequence = [];
        
        if (this.sequenceTimeout) {
          clearTimeout(this.sequenceTimeout);
          this.sequenceTimeout = null;
        }
        
        break;
      }
    }
  }

  private sequenceMatches(current: ('up' | 'down')[], pattern: ('up' | 'down')[]): boolean {
    if (current.length < pattern.length) return false;
    
    const startIndex = current.length - pattern.length;
    for (let i = 0; i < pattern.length; i++) {
      if (current[startIndex + i] !== pattern[i]) {
        return false;
      }
    }
    
    return true;
  }

  private async executePattern(pattern: VolumeKeyPattern): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
      
      console.log(`Executing volume key pattern: ${pattern.name}`);
      
      const callback = this.callbacks.get(pattern.action);
      if (callback) {
        callback();
      } else {
        // Default actions
        switch (pattern.action) {
          case 'emergency_lock':
            this.triggerEmergencyLock();
            break;
          case 'panic_mode':
            this.triggerPanicMode();
            break;
          case 'fake_vault':
            this.switchToFakeVault();
            break;
          case 'unlock':
            this.triggerQuickUnlock();
            break;
        }
      }
    } catch (error) {
      console.error('Failed to execute volume key pattern:', error);
    }
  }

  private triggerEmergencyLock(): void {
    // Immediately lock the vault and clear sensitive data
    localStorage.setItem('vaultix_emergency_lock', 'true');
    window.location.href = '/auth';
  }

  private triggerPanicMode(): void {
    // Switch to fake vault and hide real data
    localStorage.setItem('vaultix_panic_mode', 'true');
    localStorage.setItem('vaultix_fake_vault_mode', 'true');
    window.location.reload();
  }

  private switchToFakeVault(): void {
    // Toggle fake vault mode
    const currentMode = localStorage.getItem('vaultix_fake_vault_mode') === 'true';
    localStorage.setItem('vaultix_fake_vault_mode', (!currentMode).toString());
    window.location.reload();
  }

  private triggerQuickUnlock(): void {
    // Quick unlock if biometrics are available
    const event = new CustomEvent('volume_quick_unlock');
    window.dispatchEvent(event);
  }

  registerCallback(action: string, callback: () => void): void {
    this.callbacks.set(action, callback);
  }

  unregisterCallback(action: string): void {
    this.callbacks.delete(action);
  }

  async addPattern(pattern: Omit<VolumeKeyPattern, 'id'>): Promise<string> {
    const id = `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newPattern: VolumeKeyPattern = { ...pattern, id };
    
    this.patterns.push(newPattern);
    await this.savePatterns();
    
    return id;
  }

  async updatePattern(id: string, updates: Partial<VolumeKeyPattern>): Promise<boolean> {
    const index = this.patterns.findIndex(p => p.id === id);
    if (index === -1) return false;
    
    this.patterns[index] = { ...this.patterns[index], ...updates };
    await this.savePatterns();
    
    return true;
  }

  async deletePattern(id: string): Promise<boolean> {
    const index = this.patterns.findIndex(p => p.id === id);
    if (index === -1) return false;
    
    this.patterns.splice(index, 1);
    await this.savePatterns();
    
    return true;
  }

  getPatterns(): VolumeKeyPattern[] {
    return [...this.patterns];
  }

  private async loadPatterns(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_volume_patterns' });
      if (value) {
        this.patterns = JSON.parse(value);
      }
    } catch (error) {
      console.error('Failed to load volume patterns:', error);
    }
  }

  private async savePatterns(): Promise<void> {
    try {
      await Preferences.set({ 
        key: 'vaultix_volume_patterns', 
        value: JSON.stringify(this.patterns) 
      });
    } catch (error) {
      console.error('Failed to save volume patterns:', error);
    }
  }
}
