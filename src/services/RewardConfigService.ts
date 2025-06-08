
export interface RewardPrize {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'premium_theme' | 'storage_upgrade' | 'feature_unlock' | 'security_boost';
  icon: string;
  available: boolean;
  featured?: boolean;
}

export class RewardConfigService {
  private static instance: RewardConfigService;
  private prizes: RewardPrize[] = [
    {
      id: 'dark_premium',
      name: 'Dark Premium Theme',
      description: 'Unlock sleek dark theme with premium styling',
      cost: 100,
      type: 'premium_theme',
      icon: '🌙',
      available: true,
      featured: true
    },
    {
      id: 'storage_5gb',
      name: '5GB Storage Upgrade',
      description: 'Increase your secure storage capacity',
      cost: 250,
      type: 'storage_upgrade',
      icon: '💾',
      available: true
    },
    {
      id: 'advanced_encryption',
      name: 'Advanced Encryption',
      description: 'Enable military-grade encryption protocols',
      cost: 300,
      type: 'security_boost',
      icon: '🔐',
      available: true,
      featured: true
    },
    {
      id: 'ai_analyzer',
      name: 'AI File Analyzer',
      description: 'Advanced AI-powered file analysis and insights',
      cost: 200,
      type: 'feature_unlock',
      icon: '🤖',
      available: true
    },
    {
      id: 'stealth_mode',
      name: 'Enhanced Stealth Mode',
      description: 'Complete app disguise with calculator interface',
      cost: 400,
      type: 'security_boost',
      icon: '👤',
      available: true
    },
    {
      id: 'storage_unlimited',
      name: 'Unlimited Storage',
      description: 'Remove all storage limitations',
      cost: 500,
      type: 'storage_upgrade',
      icon: '∞',
      available: true,
      featured: true
    }
  ];

  static getInstance(): RewardConfigService {
    if (!RewardConfigService.instance) {
      RewardConfigService.instance = new RewardConfigService();
    }
    return RewardConfigService.instance;
  }

  getAllPrizes(): RewardPrize[] {
    return [...this.prizes];
  }

  getFeaturedPrizes(): RewardPrize[] {
    return this.prizes.filter(prize => prize.featured);
  }

  getPrizesByType(type: RewardPrize['type']): RewardPrize[] {
    return this.prizes.filter(prize => prize.type === type);
  }

  getPrizeById(id: string): RewardPrize | undefined {
    return this.prizes.find(prize => prize.id === id);
  }

  updatePrizeAvailability(id: string, available: boolean): void {
    const prize = this.prizes.find(p => p.id === id);
    if (prize) {
      prize.available = available;
    }
  }

  addCustomPrize(prize: RewardPrize): void {
    this.prizes.push(prize);
  }
}
