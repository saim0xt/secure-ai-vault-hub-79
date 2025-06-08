import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, RewardAdOptions, AdMobRewardItem } from '@capacitor-community/admob';
import { Preferences } from '@capacitor/preferences';

export interface AdMobConfig {
  appId: string;
  bannerAdUnitId: string;
  interstitialAdUnitId: string;
  rewardedAdUnitId: string;
  testDeviceIds: string[];
  enabled: boolean;
}

export interface AdRevenue {
  totalRevenue: number;
  impressions: number;
  clicks: number;
  lastUpdated: string;
}

export class AdMobService {
  private static instance: AdMobService;
  private config: AdMobConfig = {
    appId: 'ca-app-pub-3940256099942544~3347511713',
    bannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111',
    interstitialAdUnitId: 'ca-app-pub-3940256099942544/1033173712',
    rewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917',
    testDeviceIds: [],
    enabled: true
  };
  private isInitialized = false;
  private bannerVisible = false;
  private interstitialLoaded = false;
  private rewardedLoaded = false;

  static getInstance(): AdMobService {
    if (!AdMobService.instance) {
      AdMobService.instance = new AdMobService();
    }
    return AdMobService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.loadConfig();
      
      if (!this.config.enabled || !this.config.appId) {
        return;
      }

      await AdMob.initialize({
        testingDevices: this.config.testDeviceIds,
        initializeForTesting: this.config.testDeviceIds.length > 0
      });

      await this.preloadInterstitial();
      await this.preloadRewarded();

      this.isInitialized = true;
    } catch (error) {
      console.error('AdMob initialization failed:', error);
    }
  }

  async loadConfig(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_admob_config' });
      if (value) {
        this.config = { ...this.config, ...JSON.parse(value) };
      } else {
        await this.saveConfig(this.config);
      }
    } catch (error) {
      console.error('Failed to load AdMob config:', error);
    }
  }

  async saveConfig(config: Partial<AdMobConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    try {
      await Preferences.set({
        key: 'vaultix_admob_config',
        value: JSON.stringify(this.config)
      });
    } catch (error) {
      console.error('Failed to save AdMob config:', error);
    }
  }

  async showBanner(position: BannerAdPosition = BannerAdPosition.BOTTOM_CENTER): Promise<void> {
    if (!this.isInitialized || !this.config.bannerAdUnitId) return;

    try {
      const options: BannerAdOptions = {
        adId: this.config.bannerAdUnitId,
        adSize: BannerAdSize.BANNER,
        position,
        margin: 0,
        isTesting: this.config.testDeviceIds.length > 0
      };

      await AdMob.showBanner(options);
      this.bannerVisible = true;
      await this.trackImpression('banner');
    } catch (error) {
      console.error('Failed to show banner ad:', error);
    }
  }

  async hideBanner(): Promise<void> {
    if (!this.bannerVisible) return;

    try {
      await AdMob.hideBanner();
      this.bannerVisible = false;
    } catch (error) {
      console.error('Failed to hide banner ad:', error);
    }
  }

  async showInterstitial(): Promise<boolean> {
    if (!this.isInitialized || !this.interstitialLoaded) {
      await this.preloadInterstitial();
      if (!this.interstitialLoaded) return false;
    }

    try {
      await AdMob.showInterstitial();
      this.interstitialLoaded = false;
      await this.trackImpression('interstitial');
      
      setTimeout(() => this.preloadInterstitial(), 1000);
      
      return true;
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
      return false;
    }
  }

  async showRewardedAd(): Promise<{ rewarded: boolean; reward?: AdMobRewardItem }> {
    if (!this.isInitialized || !this.rewardedLoaded) {
      await this.preloadRewarded();
      if (!this.rewardedLoaded) return { rewarded: false };
    }

    try {
      const result = await AdMob.showRewardVideoAd();
      this.rewardedLoaded = false;
      await this.trackImpression('rewarded');
      
      setTimeout(() => this.preloadRewarded(), 1000);
      
      return { 
        rewarded: true, 
        reward: result
      };
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
      return { rewarded: false };
    }
  }

  private async preloadInterstitial(): Promise<void> {
    if (!this.config.interstitialAdUnitId) return;

    try {
      const options = {
        adId: this.config.interstitialAdUnitId,
        isTesting: this.config.testDeviceIds.length > 0
      };

      await AdMob.prepareInterstitial(options);
      this.interstitialLoaded = true;
    } catch (error) {
      console.error('Failed to preload interstitial ad:', error);
      this.interstitialLoaded = false;
    }
  }

  private async preloadRewarded(): Promise<void> {
    if (!this.config.rewardedAdUnitId) return;

    try {
      const options: RewardAdOptions = {
        adId: this.config.rewardedAdUnitId,
        isTesting: this.config.testDeviceIds.length > 0
      };

      await AdMob.prepareRewardVideoAd(options);
      this.rewardedLoaded = true;
    } catch (error) {
      console.error('Failed to preload rewarded ad:', error);
      this.rewardedLoaded = false;
    }
  }

  private async trackImpression(adType: 'banner' | 'interstitial' | 'rewarded'): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_ad_revenue' });
      const revenue: AdRevenue = value ? JSON.parse(value) : {
        totalRevenue: 0,
        impressions: 0,
        clicks: 0,
        lastUpdated: new Date().toISOString()
      };

      revenue.impressions += 1;
      
      const estimatedRevenue = {
        banner: 0.001,
        interstitial: 0.01,
        rewarded: 0.05
      };
      
      revenue.totalRevenue += estimatedRevenue[adType];
      revenue.lastUpdated = new Date().toISOString();

      await Preferences.set({
        key: 'vaultix_ad_revenue',
        value: JSON.stringify(revenue)
      });
    } catch (error) {
      console.error('Failed to track ad impression:', error);
    }
  }

  async getRevenue(): Promise<AdRevenue> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_ad_revenue' });
      return value ? JSON.parse(value) : {
        totalRevenue: 0,
        impressions: 0,
        clicks: 0,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      return {
        totalRevenue: 0,
        impressions: 0,
        clicks: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.config.enabled;
  }

  getConfig(): AdMobConfig {
    return { ...this.config };
  }
}
