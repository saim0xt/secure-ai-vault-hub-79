
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AdMobService } from './AdMobService';

export interface UserCoins {
  balance: number;
  totalEarned: number;
  lastUpdated: string;
}

export interface RewardItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'theme' | 'feature' | 'storage' | 'coins';
  value: any;
  available: boolean;
}

export interface SpinWheelPrize {
  id: string;
  name: string;
  coins: number;
  probability: number;
  color: string;
  icon: string;
}

export interface ScratchCard {
  id: string;
  isRevealed: boolean;
  prize: SpinWheelPrize;
  createdAt: string;
}

export class RewardSystemService {
  private static instance: RewardSystemService;
  private adMobService = AdMobService.getInstance();

  static getInstance(): RewardSystemService {
    if (!RewardSystemService.instance) {
      RewardSystemService.instance = new RewardSystemService();
    }
    return RewardSystemService.instance;
  }

  private spinWheelPrizes: SpinWheelPrize[] = [
    { id: '1', name: '10 Coins', coins: 10, probability: 30, color: '#FFD700', icon: '🪙' },
    { id: '2', name: '25 Coins', coins: 25, probability: 25, color: '#FF6B6B', icon: '💰' },
    { id: '3', name: '50 Coins', coins: 50, probability: 20, color: '#4ECDC4', icon: '💎' },
    { id: '4', name: '100 Coins', coins: 100, probability: 15, color: '#45B7D1', icon: '🏆' },
    { id: '5', name: '250 Coins', coins: 250, probability: 8, color: '#96CEB4', icon: '👑' },
    { id: '6', name: '500 Coins', coins: 500, probability: 2, color: '#FFEAA7', icon: '🎯' }
  ];

  private rewardItems: RewardItem[] = [
    {
      id: 'theme_dark_premium',
      name: 'Premium Dark Theme',
      description: 'Exclusive dark theme with gradient accents',
      cost: 100,
      type: 'theme',
      value: 'premium_dark',
      available: true
    },
    {
      id: 'theme_neon',
      name: 'Neon Theme',
      description: 'Cyberpunk-inspired neon theme',
      cost: 150,
      type: 'theme',
      value: 'neon',
      available: true
    },
    {
      id: 'storage_1gb',
      name: '1GB Extra Storage',
      description: 'Increase your vault storage limit',
      cost: 200,
      type: 'storage',
      value: 1024 * 1024 * 1024,
      available: true
    },
    {
      id: 'feature_advanced_ai',
      name: 'Advanced AI Features',
      description: 'Unlock premium AI analysis and organization',
      cost: 300,
      type: 'feature',
      value: 'advanced_ai',
      available: true
    },
    {
      id: 'coins_bonus',
      name: 'Double Coins (24h)',
      description: 'Earn double coins for 24 hours',
      cost: 50,
      type: 'coins',
      value: 24,
      available: true
    }
  ];

  async getUserCoins(): Promise<UserCoins> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_user_coins' });
      if (value) {
        return JSON.parse(value);
      }
      
      const defaultCoins: UserCoins = {
        balance: 50, // Starting bonus
        totalEarned: 50,
        lastUpdated: new Date().toISOString()
      };
      
      await this.saveUserCoins(defaultCoins);
      return defaultCoins;
    } catch (error) {
      console.error('Failed to get user coins:', error);
      return { balance: 0, totalEarned: 0, lastUpdated: new Date().toISOString() };
    }
  }

  async saveUserCoins(coins: UserCoins): Promise<void> {
    try {
      await Preferences.set({ 
        key: 'vaultix_user_coins', 
        value: JSON.stringify(coins) 
      });
    } catch (error) {
      console.error('Failed to save user coins:', error);
    }
  }

  async addCoins(amount: number, reason: string = 'reward'): Promise<UserCoins> {
    const currentCoins = await this.getUserCoins();
    const updatedCoins: UserCoins = {
      balance: currentCoins.balance + amount,
      totalEarned: currentCoins.totalEarned + amount,
      lastUpdated: new Date().toISOString()
    };
    
    await this.saveUserCoins(updatedCoins);
    await Haptics.impact({ style: ImpactStyle.Light });
    
    console.log(`Added ${amount} coins for ${reason}`);
    return updatedCoins;
  }

  async spendCoins(amount: number, reason: string = 'purchase'): Promise<boolean> {
    const currentCoins = await this.getUserCoins();
    
    if (currentCoins.balance < amount) {
      return false;
    }
    
    const updatedCoins: UserCoins = {
      ...currentCoins,
      balance: currentCoins.balance - amount,
      lastUpdated: new Date().toISOString()
    };
    
    await this.saveUserCoins(updatedCoins);
    console.log(`Spent ${amount} coins for ${reason}`);
    return true;
  }

  async spinWheel(): Promise<SpinWheelPrize | null> {
    try {
      // Check if user can spin (cooldown logic)
      const lastSpin = await Preferences.get({ key: 'vaultix_last_spin' });
      const now = Date.now();
      const spinCooldown = 6 * 60 * 60 * 1000; // 6 hours
      
      if (lastSpin.value && now - parseInt(lastSpin.value) < spinCooldown) {
        throw new Error('Spin wheel is on cooldown');
      }
      
      // Show rewarded ad first
      const adResult = await this.adMobService.showRewardedAd();
      if (!adResult.rewarded) {
        throw new Error('Must watch ad to spin wheel');
      }
      
      // Generate random prize based on probabilities
      const random = Math.random() * 100;
      let cumulativeProbability = 0;
      
      for (const prize of this.spinWheelPrizes) {
        cumulativeProbability += prize.probability;
        if (random <= cumulativeProbability) {
          await this.addCoins(prize.coins, 'spin_wheel');
          await Preferences.set({ key: 'vaultix_last_spin', value: now.toString() });
          await Haptics.impact({ style: ImpactStyle.Heavy });
          return prize;
        }
      }
      
      // Fallback to smallest prize
      const fallbackPrize = this.spinWheelPrizes[0];
      await this.addCoins(fallbackPrize.coins, 'spin_wheel');
      return fallbackPrize;
    } catch (error) {
      console.error('Spin wheel failed:', error);
      return null;
    }
  }

  async generateScratchCard(): Promise<ScratchCard | null> {
    try {
      // Check daily scratch card limit
      const todayCards = await this.getTodayScratchCards();
      if (todayCards.length >= 3) {
        throw new Error('Daily scratch card limit reached');
      }
      
      // Show interstitial ad
      await this.adMobService.showInterstitial();
      
      // Generate random prize
      const randomIndex = Math.floor(Math.random() * this.spinWheelPrizes.length);
      const prize = this.spinWheelPrizes[randomIndex];
      
      const scratchCard: ScratchCard = {
        id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        isRevealed: false,
        prize: prize,
        createdAt: new Date().toISOString()
      };
      
      await this.saveScratchCard(scratchCard);
      return scratchCard;
    } catch (error) {
      console.error('Failed to generate scratch card:', error);
      return null;
    }
  }

  async revealScratchCard(cardId: string): Promise<SpinWheelPrize | null> {
    try {
      const cards = await this.getScratchCards();
      const card = cards.find(c => c.id === cardId);
      
      if (!card || card.isRevealed) {
        return null;
      }
      
      card.isRevealed = true;
      await this.saveScratchCard(card);
      await this.addCoins(card.prize.coins, 'scratch_card');
      await Haptics.impact({ style: ImpactStyle.Medium });
      
      return card.prize;
    } catch (error) {
      console.error('Failed to reveal scratch card:', error);
      return null;
    }
  }

  private async getTodayScratchCards(): Promise<ScratchCard[]> {
    const cards = await this.getScratchCards();
    const today = new Date().toDateString();
    return cards.filter(card => new Date(card.createdAt).toDateString() === today);
  }

  private async getScratchCards(): Promise<ScratchCard[]> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_scratch_cards' });
      return value ? JSON.parse(value) : [];
    } catch (error) {
      console.error('Failed to get scratch cards:', error);
      return [];
    }
  }

  private async saveScratchCard(card: ScratchCard): Promise<void> {
    try {
      const cards = await this.getScratchCards();
      const existingIndex = cards.findIndex(c => c.id === card.id);
      
      if (existingIndex >= 0) {
        cards[existingIndex] = card;
      } else {
        cards.push(card);
      }
      
      await Preferences.set({ 
        key: 'vaultix_scratch_cards', 
        value: JSON.stringify(cards) 
      });
    } catch (error) {
      console.error('Failed to save scratch card:', error);
    }
  }

  getRewardItems(): RewardItem[] {
    return this.rewardItems;
  }

  async purchaseReward(itemId: string): Promise<boolean> {
    const item = this.rewardItems.find(r => r.id === itemId);
    if (!item || !item.available) {
      return false;
    }
    
    const success = await this.spendCoins(item.cost, `purchase_${item.name}`);
    if (success) {
      await this.applyReward(item);
      await Haptics.impact({ style: ImpactStyle.Heavy });
    }
    
    return success;
  }

  private async applyReward(item: RewardItem): Promise<void> {
    try {
      switch (item.type) {
        case 'theme':
          await Preferences.set({ key: 'vaultix_active_theme', value: item.value });
          break;
        case 'feature':
          const features = await Preferences.get({ key: 'vaultix_premium_features' });
          const currentFeatures = features.value ? JSON.parse(features.value) : [];
          currentFeatures.push(item.value);
          await Preferences.set({ key: 'vaultix_premium_features', value: JSON.stringify(currentFeatures) });
          break;
        case 'storage':
          const storage = await Preferences.get({ key: 'vaultix_extra_storage' });
          const currentStorage = storage.value ? parseInt(storage.value) : 0;
          await Preferences.set({ key: 'vaultix_extra_storage', value: (currentStorage + item.value).toString() });
          break;
        case 'coins':
          await Preferences.set({ key: 'vaultix_double_coins_until', value: (Date.now() + item.value * 60 * 60 * 1000).toString() });
          break;
      }
      
      console.log(`Applied reward: ${item.name}`);
    } catch (error) {
      console.error('Failed to apply reward:', error);
    }
  }

  async getDailyLoginReward(): Promise<number> {
    try {
      const lastLogin = await Preferences.get({ key: 'vaultix_last_daily_login' });
      const today = new Date().toDateString();
      
      if (lastLogin.value !== today) {
        await Preferences.set({ key: 'vaultix_last_daily_login', value: today });
        const coins = await this.addCoins(20, 'daily_login');
        return 20;
      }
      
      return 0;
    } catch (error) {
      console.error('Failed to process daily login reward:', error);
      return 0;
    }
  }
}
