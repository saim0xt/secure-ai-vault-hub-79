
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, RewardAdOptions, AdmobConsentStatus, AdmobConsentInfo } from '@capacitor-community/admob';
import { Preferences } from '@capacitor/preferences';

export interface AdConfig {
  bannerAdUnitId: string;
  interstitialAdUnitId: string;
  rewardedAdUnitId: string;
  testMode: boolean;
}

export class AdMobService {
  private static instance: AdMobService;
  private config: AdConfig = {
    bannerAdUnitId: 'ca-app-pub-3940256099942544/6300978111', // Test ID
    interstitialAdUnitId: 'ca-app-pub-3940256099942544/1033173712', // Test ID
    rewardedAdUnitId: 'ca-app-pub-3940256099942544/5224354917', // Test ID
    testMode: true
  };
  private isInitialized = false;

  static getInstance(): AdMobService {
    if (!AdMobService.instance) {
      AdMobService.instance = new AdMobService();
    }
    return AdMobService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await AdMob.initialize({
        testingDevices: ['your-test-device-id'],
        initializeForTesting: this.config.testMode,
      });

      const consentInfo = await AdMob.requestConsentInfo();
      
      if (consentInfo.isConsentFormAvailable && consentInfo.status === AdmobConsentStatus.REQUIRED) {
        await AdMob.showConsentForm();
      }

      this.isInitialized = true;
      console.log('AdMob initialized successfully');
    } catch (error) {
      console.error('AdMob initialization failed:', error);
    }
  }

  async showBannerAd(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const options: BannerAdOptions = {
        adId: this.config.bannerAdUnitId,
        adSize: BannerAdSize.BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: this.config.testMode
      };

      await AdMob.showBanner(options);
      console.log('Banner ad shown');
    } catch (error) {
      console.error('Failed to show banner ad:', error);
    }
  }

  async hideBannerAd(): Promise<void> {
    try {
      await AdMob.hideBanner();
    } catch (error) {
      console.error('Failed to hide banner ad:', error);
    }
  }

  async showInterstitialAd(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const options = {
        adId: this.config.interstitialAdUnitId,
        isTesting: this.config.testMode
      };

      await AdMob.prepareInterstitial(options);
      await AdMob.showInterstitial();
      
      console.log('Interstitial ad shown');
      return true;
    } catch (error) {
      console.error('Failed to show interstitial ad:', error);
      return false;
    }
  }

  async showRewardedAd(): Promise<{ shown: boolean; rewarded: boolean }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const options: RewardAdOptions = {
        adId: this.config.rewardedAdUnitId,
        isTesting: this.config.testMode
      };

      await AdMob.prepareRewardVideoAd(options);
      const result = await AdMob.showRewardVideoAd();
      
      console.log('Rewarded ad completed:', result);
      return { shown: true, rewarded: result.reward !== null && result.reward !== undefined };
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
      return { shown: false, rewarded: false };
    }
  }

  async updateConfig(newConfig: Partial<AdConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await Preferences.set({ 
      key: 'vaultix_ad_config', 
      value: JSON.stringify(this.config) 
    });
  }

  async loadConfig(): Promise<void> {
    try {
      const { value } = await Preferences.get({ key: 'vaultix_ad_config' });
      if (value) {
        this.config = { ...this.config, ...JSON.parse(value) };
      }
    } catch (error) {
      console.error('Failed to load ad config:', error);
    }
  }
}
