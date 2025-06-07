
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Gift, Sparkles, Star, ShoppingBag } from 'lucide-react';
import { RewardSystemService, UserCoins, SpinWheelPrize, ScratchCard, RewardItem } from '@/services/RewardSystemService';
import { AdMobService } from '@/services/AdMobService';
import SpinWheelComponent from './SpinWheelComponent';
import ScratchCardComponent from './ScratchCardComponent';

const RewardsCenter = () => {
  const navigate = useNavigate();
  const rewardService = RewardSystemService.getInstance();
  const adService = AdMobService.getInstance();

  const [userCoins, setUserCoins] = useState<UserCoins>({ balance: 0, totalEarned: 0, lastUpdated: '' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'earn' | 'spend' | 'store'>('earn');
  const [showSpinWheel, setShowSpinWheel] = useState(false);
  const [scratchCards, setScratchCards] = useState<ScratchCard[]>([]);
  const [rewardItems, setRewardItems] = useState<RewardItem[]>([]);

  useEffect(() => {
    loadData();
    adService.initialize();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const coins = await rewardService.getUserCoins();
      setUserCoins(coins);
      
      const items = rewardService.getRewardItems();
      setRewardItems(items);
      
      // Check for daily login reward
      const dailyReward = await rewardService.getDailyLoginReward();
      if (dailyReward > 0) {
        // Show daily reward notification
        console.log(`Daily login reward: ${dailyReward} coins`);
      }
    } catch (error) {
      console.error('Failed to load rewards data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSpinWheel = async () => {
    try {
      const prize = await rewardService.spinWheel();
      if (prize) {
        console.log('Spin wheel prize:', prize);
        await loadData(); // Refresh coins
      }
    } catch (error) {
      console.error('Spin wheel failed:', error);
    }
  };

  const generateScratchCard = async () => {
    try {
      const card = await rewardService.generateScratchCard();
      if (card) {
        setScratchCards(prev => [...prev, card]);
      }
    } catch (error) {
      console.error('Failed to generate scratch card:', error);
    }
  };

  const revealScratchCard = async (cardId: string) => {
    try {
      const prize = await rewardService.revealScratchCard(cardId);
      if (prize) {
        console.log('Scratch card prize:', prize);
        await loadData(); // Refresh coins
        setScratchCards(prev => prev.map(card => 
          card.id === cardId ? { ...card, isRevealed: true } : card
        ));
      }
    } catch (error) {
      console.error('Failed to reveal scratch card:', error);
    }
  };

  const purchaseReward = async (itemId: string) => {
    try {
      const success = await rewardService.purchaseReward(itemId);
      if (success) {
        await loadData(); // Refresh coins
        console.log('Reward purchased successfully');
      } else {
        console.log('Insufficient coins for purchase');
      }
    } catch (error) {
      console.error('Failed to purchase reward:', error);
    }
  };

  const showRewardedAd = async () => {
    try {
      const result = await adService.showRewardedAd();
      if (result.rewarded) {
        await rewardService.addCoins(25, 'watched_ad');
        await loadData();
      }
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading rewards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Rewards Center</h1>
              <p className="text-sm text-muted-foreground">Earn coins and unlock premium features</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{userCoins.balance}</p>
              <p className="text-xs text-muted-foreground">Coins</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="p-4">
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          {[
            { id: 'earn', label: 'Earn Coins', icon: Gift },
            { id: 'spend', label: 'Rewards', icon: Star },
            { id: 'store', label: 'Store', icon: ShoppingBag }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Earn Coins Tab */}
        {activeTab === 'earn' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Daily Rewards */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Daily Rewards</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
                  <h4 className="font-semibold">Spin Wheel</h4>
                  <p className="text-sm opacity-90">Spin once every 6 hours</p>
                  <Button
                    className="w-full mt-3 bg-white/20 hover:bg-white/30 text-white"
                    onClick={() => setShowSpinWheel(true)}
                  >
                    Spin Now
                  </Button>
                </div>
                
                <div className="p-4 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg text-white">
                  <h4 className="font-semibold">Scratch Cards</h4>
                  <p className="text-sm opacity-90">Get 3 cards daily</p>
                  <Button
                    className="w-full mt-3 bg-white/20 hover:bg-white/30 text-white"
                    onClick={generateScratchCard}
                  >
                    Get Card
                  </Button>
                </div>
              </div>
            </Card>

            {/* Ad Rewards */}
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-foreground mb-4">Watch & Earn</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <h4 className="font-medium text-foreground">Watch Rewarded Ad</h4>
                    <p className="text-sm text-muted-foreground">Earn 25 coins per ad</p>
                  </div>
                  <Button onClick={showRewardedAd} size="sm">
                    Watch Ad
                  </Button>
                </div>
              </div>
            </Card>

            {/* Scratch Cards Display */}
            {scratchCards.length > 0 && (
              <Card className="p-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Your Scratch Cards</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {scratchCards.map((card) => (
                    <ScratchCardComponent
                      key={card.id}
                      card={card}
                      onReveal={() => revealScratchCard(card.id)}
                    />
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {/* Store Tab */}
        {activeTab === 'store' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewardItems.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-foreground">{item.name}</h4>
                    <Badge variant="outline" className="text-primary">
                      {item.cost} coins
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                  <Button
                    className="w-full"
                    variant={userCoins.balance >= item.cost ? "default" : "outline"}
                    disabled={userCoins.balance < item.cost || !item.available}
                    onClick={() => purchaseReward(item.id)}
                  >
                    {userCoins.balance >= item.cost ? 'Purchase' : 'Insufficient Coins'}
                  </Button>
                </Card>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Spin Wheel Modal */}
      <AnimatePresence>
        {showSpinWheel && (
          <SpinWheelComponent
            onClose={() => setShowSpinWheel(false)}
            onSpin={handleSpinWheel}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RewardsCenter;
