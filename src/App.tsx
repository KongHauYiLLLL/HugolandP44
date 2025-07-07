import React, { useState, Suspense, useEffect } from 'react';
import useGameState from './hooks/useGameState';
import { Combat } from './components/Combat';
import { Shop } from './components/Shop';
import { Inventory } from './components/Inventory';
import { PlayerStats } from './components/PlayerStats';
import { Mining } from './components/Mining';
import { Merchant } from './components/Merchant';
import { FloatingIcons } from './components/FloatingIcons';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { Shield, Package, User, Play, RotateCcw, Crown, Gift, Pickaxe, Menu, ArrowLeft, Store } from 'lucide-react';
import { animateButtonClick, initGSAPAnimations } from './utils/gsapAnimations';

// Lazy load heavy components
import {
  LazyStatistics,
  LazyAchievements,
  LazyCollectionBook,
  LazyEnhancedGameModes,
  LazyPokyegMarket,
  LazyTutorial,
  LazyCheatPanel,
  LazyDailyRewards,
  LazyOfflineProgress,
  LazyBulkActions,
  LazyHamburgerMenuPage,
  LazyGardenOfGrowth,
  LazyGameSettings,
  LazyDevTools,
  LazySkills,
  LazyYojefMarket,
  LazyProgressionPanel,
  LazyAdventureSkillSelection
} from './components/LazyComponents';

type GameView = 'stats' | 'shop' | 'inventory' | 'mining' | 'merchant' | 'menu';
type ModalView = 'collection' | 'gameMode' | 'pokyegMarket' | 'tutorial' | 'cheats' | 'resetConfirm' | 'dailyRewards' | 'offlineProgress' | 'bulkActions' | null;

// Loading component for Suspense fallback
const LoadingSpinner = () => (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
    <div className="text-center">
      <div className="animate-spin inline-block w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full mb-4"></div>
      <p className="text-white text-lg font-semibold">Loading...</p>
    </div>
  </div>
);

function App() {
  const {
    gameState,
    isLoading,
    equipWeapon,
    equipArmor,
    upgradeWeapon,
    upgradeArmor,
    sellWeapon,
    sellArmor,
    openChest,
    purchaseMythical,
    startCombat,
    attack,
    resetGame,
    setGameMode,
    toggleCheat,
    generateCheatItem,
    mineGem,
    exchangeShinyGems,
    discardItem,
    purchaseRelic,
    upgradeRelic,
    equipRelic,
    unequipRelic,
    sellRelic,
    claimDailyReward,
    upgradeSkill,
    prestige,
    claimOfflineRewards,
    bulkSell,
    bulkUpgrade,
    plantSeed,
    buyWater,
    updateSettings,
    addCoins,
    addGems,
    teleportToZone,
    setExperience,
    rollSkill,
    selectAdventureSkill,
    skipAdventureSkills,
    useSkipCard,
    spendFragments,
    selectMerchantReward,
  } = useGameState();

  const [currentView, setCurrentView] = useState<GameView>('stats');
  const [currentModal, setCurrentModal] = useState<ModalView>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [gsapInitialized, setGsapInitialized] = useState(false);

  // Initialize GSAP only once when component mounts
  useEffect(() => {
    if (!gsapInitialized) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        initGSAPAnimations();
        setGsapInitialized(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [gsapInitialized]);

  // Add click animation to buttons only - but only after GSAP is initialized
  useEffect(() => {
    if (!gsapInitialized) return;

    const timer = setTimeout(() => {
      const buttons = document.querySelectorAll('button');
      
      const handleButtonClick = (event: Event) => {
        animateButtonClick(event.currentTarget as HTMLElement);
      };

      buttons.forEach(button => {
        // Remove existing listeners to prevent duplicates
        button.removeEventListener('click', handleButtonClick);
        button.addEventListener('click', handleButtonClick);
      });

      return () => {
        buttons.forEach(button => {
          button.removeEventListener('click', handleButtonClick);
        });
      };
    }, 100);

    return () => clearTimeout(timer);
  }, [currentView, currentModal, gameState?.inCombat, showWelcome, gsapInitialized]);

  // Show loading screen while game state is loading or critical properties are not initialized
  if (isLoading || !gameState || !gameState.playerStats || !gameState.inventory || !gameState.statistics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full mb-6"></div>
          <p className="text-white text-xl font-semibold">Loading Hugoland...</p>
          <p className="text-purple-300 text-sm mt-2">Preparing your adventure...</p>
        </div>
      </div>
    );
  }

  // Show adventure skill selection modal
  if (gameState?.adventureSkills?.showSelectionModal && !gameState.inCombat) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <FloatingIcons />
        <Suspense fallback={<LoadingSpinner />}>
          <LazyAdventureSkillSelection
            availableSkills={gameState.adventureSkills.availableSkills}
            onSelectSkill={selectAdventureSkill}
            onSkipSkills={skipAdventureSkills}
          />
        </Suspense>
      </div>
    );
  }

  // ONLY show modals if NOT in combat
  if (!gameState.inCombat) {
    // Show offline progress modal if there are rewards
    if (gameState.offlineProgress && (gameState.offlineProgress.offlineCoins > 0 || gameState.offlineProgress.offlineGems > 0)) {
      if (currentModal !== 'offlineProgress') {
        setCurrentModal('offlineProgress');
      }
    }
    // Show daily rewards modal if available (only after offline progress is handled)
    else if (gameState.dailyRewards?.availableReward && currentModal !== 'dailyRewards') {
      setCurrentModal('dailyRewards');
    }
  }

  // Show welcome screen for new players
  if (showWelcome && gameState.zone === 1 && gameState.coins === 500) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 ${gameState.settings?.snapToGrid ? 'snap-to-grid' : ''} ${gameState.settings?.beautyMode ? 'beauty-mode' : ''}`}>
        <FloatingIcons />
        <div className="text-center max-w-lg mx-auto relative z-10 start-screen-animate">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6 leading-tight start-screen-animate">
              🏰 Welcome to<br />Hugoland! 🗡️
            </h1>
            <p className="text-purple-300 text-base sm:text-lg md:text-xl mb-8 leading-relaxed start-screen-animate">
              The ultimate fantasy adventure game where knowledge is your greatest weapon!
            </p>
            
            <div className="bg-black/40 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-purple-500/30 mb-8 glass-effect start-screen-animate">
              <h3 className="text-white font-bold mb-4 text-base sm:text-lg">🎮 What awaits you:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm text-purple-200">
                <div className="flex items-center gap-2 start-screen-animate">
                  <span className="text-green-400">•</span>
                  <span>Answer trivia questions to defeat enemies</span>
                </div>
                <div className="flex items-center gap-2 start-screen-animate">
                  <span className="text-blue-400">•</span>
                  <span>Collect powerful weapons and armor</span>
                </div>
                <div className="flex items-center gap-2 start-screen-animate">
                  <span className="text-purple-400">•</span>
                  <span>Mine gems and find rare treasures</span>
                </div>
                <div className="flex items-center gap-2 start-screen-animate">
                  <span className="text-yellow-400">•</span>
                  <span>Unlock achievements and streaks</span>
                </div>
                <div className="flex items-center gap-2 start-screen-animate">
                  <span className="text-red-400">•</span>
                  <span>Explore multiple game modes</span>
                </div>
                <div className="flex items-center gap-2 start-screen-animate">
                  <span className="text-cyan-400">•</span>
                  <span>Progress through infinite zones</span>
                </div>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setShowWelcome(false)}
            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 transform hover:scale-105 flex items-center gap-3 justify-center text-base sm:text-lg shadow-lg shadow-purple-500/25 start-screen-animate"
          >
            <Play className="w-5 h-5 sm:w-6 sm:h-6" />
            Start Your Adventure
          </button>
          
          <p className="text-gray-400 text-xs sm:text-sm mt-4 start-screen-animate">
            Begin your journey in the magical world of Hugoland
          </p>
        </div>
      </div>
    );
  }

  const handleResetGame = () => {
    setCurrentModal('resetConfirm');
  };

  const confirmReset = () => {
    resetGame();
    setCurrentModal(null);
  };

  const renderCurrentView = () => {
    if (gameState.inCombat && gameState.currentEnemy) {
      return (
        <Combat
          enemy={gameState.currentEnemy}
          playerStats={gameState.playerStats}
          onAttack={attack}
          combatLog={gameState.combatLog}
          gameMode={gameState.gameMode}
          knowledgeStreak={gameState.knowledgeStreak}
          hasUsedRevival={gameState.hasUsedRevival}
          adventureSkills={gameState.adventureSkills}
          onUseSkipCard={useSkipCard}
        />
      );
    }

    switch (currentView) {
      case 'menu':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <LazyHamburgerMenuPage
              gameState={gameState}
              onPlantSeed={plantSeed}
              onBuyWater={buyWater}
              onUpgradeSkill={upgradeSkill}
              onPrestige={prestige}
              onUpdateSettings={updateSettings}
              onAddCoins={addCoins}
              onAddGems={addGems}
              onTeleportToZone={teleportToZone}
              onSetExperience={setExperience}
              onRollSkill={rollSkill}
              onPurchaseRelic={purchaseRelic}
              onBack={() => setCurrentView('stats')}
            />
          </Suspense>
        );
      case 'stats':
        return (
          <div className="space-y-4 sm:space-y-6">
            <PlayerStats
              playerStats={gameState.playerStats}
              zone={gameState.zone}
              coins={gameState.coins}
              gems={gameState.gems}
              shinyGems={gameState.shinyGems}
              playerTags={gameState.playerTags}
              progression={gameState.progression}
            />

            {/* Garden Status */}
            {gameState.gardenOfGrowth?.isPlanted && (
              <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 p-4 sm:p-6 rounded-xl border border-green-500/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold text-base sm:text-lg flex items-center gap-2">
                    <span className="text-xl sm:text-2xl">🌱</span>
                    Garden of Growth
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="text-center bg-black/20 p-3 rounded-lg">
                    <p className="text-green-300 font-semibold text-sm">Growth</p>
                    <p className="text-white text-lg sm:text-xl font-bold">{gameState.gardenOfGrowth.growthCm.toFixed(1)}cm</p>
                  </div>
                  <div className="text-center bg-black/20 p-3 rounded-lg">
                    <p className="text-blue-300 font-semibold text-sm">Stat Bonus</p>
                    <p className="text-white text-lg sm:text-xl font-bold">+{gameState.gardenOfGrowth.totalGrowthBonus.toFixed(1)}%</p>
                  </div>
                  <div className="text-center bg-black/20 p-3 rounded-lg">
                    <p className="text-cyan-300 font-semibold text-sm">Water Left</p>
                    <p className="text-white text-lg sm:text-xl font-bold">{gameState.gardenOfGrowth.waterHoursRemaining.toFixed(1)}h</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((gameState.gardenOfGrowth.growthCm / gameState.gardenOfGrowth.maxGrowthCm) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-center text-gray-300 text-xs sm:text-sm mt-2">
                    Progress to maximum growth ({gameState.gardenOfGrowth.maxGrowthCm}cm)
                  </p>
                </div>
              </div>
            )}
            
            {/* Knowledge Streak Display */}
            {gameState.knowledgeStreak?.current > 0 && (
              <div className="bg-gradient-to-r from-yellow-900/50 to-orange-900/50 p-4 sm:p-6 rounded-xl border border-yellow-500/50 backdrop-blur-sm">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <span className="text-2xl sm:text-3xl animate-pulse">🔥</span>
                    <h3 className="text-yellow-400 font-bold text-lg sm:text-xl">Knowledge Streak!</h3>
                  </div>
                  <p className="text-white text-base sm:text-lg mb-2">
                    {gameState.knowledgeStreak.current} correct answers in a row
                  </p>
                  <p className="text-yellow-300 font-semibold text-sm sm:text-base">
                    +{Math.round((gameState.knowledgeStreak.multiplier - 1) * 100)}% reward bonus
                  </p>
                </div>
              </div>
            )}

            <div className="text-center space-y-4 sm:space-y-6">
              <button
                onClick={startCombat}
                disabled={gameState.playerStats.hp <= 0 || (gameState.gameMode?.current === 'survival' && gameState.gameMode.survivalLives <= 0)}
                className={`w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold text-white transition-all duration-300 transform flex items-center gap-3 justify-center text-base sm:text-lg shadow-lg ${
                  gameState.playerStats.hp > 0 && (gameState.gameMode?.current !== 'survival' || gameState.gameMode.survivalLives > 0)
                    ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 hover:scale-105 shadow-green-500/25'
                    : 'bg-gray-600 cursor-not-allowed opacity-50'
                }`}
              >
                <Play className="w-5 h-5 sm:w-6 sm:h-6" />
                {gameState.playerStats.hp <= 0 
                  ? 'You are defeated!' 
                  : gameState.gameMode?.current === 'survival' && gameState.gameMode.survivalLives <= 0
                    ? 'No lives remaining!'
                    : 'Start Adventure'}
              </button>
              
              {(gameState.playerStats.hp <= 0 || (gameState.gameMode?.current === 'survival' && gameState.gameMode.survivalLives <= 0)) && (
                <div className="bg-red-900/30 p-4 rounded-lg border border-red-500/50">
                  <p className="text-red-400 text-sm">
                    {gameState.gameMode?.current === 'survival' && gameState.gameMode.survivalLives <= 0
                      ? 'Change game mode or reset to continue!'
                      : 'Visit the shop to get better equipment and try again!'}
                  </p>
                </div>
              )}
              
              {gameState.isPremium && (
                <div className="bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 p-4 rounded-xl border border-yellow-500/50 backdrop-blur-sm">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                    <span className="text-white font-bold text-base sm:text-lg">🎉 PREMIUM MEMBER! 🎉</span>
                  </div>
                  <p className="text-yellow-100 text-xs sm:text-sm">
                    You've reached Zone 50! Enjoy exclusive rewards and special features!
                  </p>
                </div>
              )}
              
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                <button
                  onClick={() => setCurrentModal('gameMode')}
                  className="px-3 sm:px-4 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 transition-all duration-200 flex items-center gap-2 text-xs sm:text-sm shadow-md"
                >
                  <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Game Mode</span>
                  <span className="sm:hidden">Mode</span>
                </button>
                
                <button
                  onClick={() => setCurrentModal('dailyRewards')}
                  className="px-3 sm:px-4 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 transition-all duration-200 flex items-center gap-2 text-xs sm:text-sm shadow-md"
                >
                  <Gift className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Daily Rewards</span>
                  <span className="sm:hidden">Daily</span>
                </button>
                
                <button
                  onClick={handleResetGame}
                  className="px-3 sm:px-4 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 transition-all duration-200 flex items-center gap-2 text-xs sm:text-sm shadow-md"
                >
                  <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Reset Game</span>
                  <span className="sm:hidden">Reset</span>
                </button>
              </div>
            </div>
          </div>
        );
      case 'shop':
        return <Shop coins={gameState.coins} onOpenChest={openChest} onDiscardItem={discardItem} isPremium={gameState.isPremium} />;
      case 'inventory':
        return (
          <Inventory
            inventory={gameState.inventory}
            gems={gameState.gems}
            onEquipWeapon={equipWeapon}
            onEquipArmor={equipArmor}
            onUpgradeWeapon={upgradeWeapon}
            onUpgradeArmor={upgradeArmor}
            onSellWeapon={sellWeapon}
            onSellArmor={sellArmor}
            onUpgradeRelic={upgradeRelic}
            onEquipRelic={equipRelic}
            onUnequipRelic={unequipRelic}
            onSellRelic={sellRelic}
          />
        );
      case 'mining':
        return (
          <Mining
            mining={gameState.mining}
            gems={gameState.gems}
            shinyGems={gameState.shinyGems}
            onMineGem={mineGem}
            onExchangeShinyGems={exchangeShinyGems}
          />
        );
      case 'merchant':
        return (
          <Merchant
            merchant={gameState.merchant}
            onSpendFragments={spendFragments}
            onSelectReward={selectMerchantReward}
          />
        );
      default:
        return null;
    }
  };

  const renderModal = () => {
    // Don't show any modals during combat except for reset confirmation
    if (gameState.inCombat && currentModal !== 'resetConfirm') {
      return null;
    }

    switch (currentModal) {
      case 'collection':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <LazyCollectionBook
              collectionBook={gameState.collectionBook}
              allWeapons={gameState.inventory.weapons}
              allArmor={gameState.inventory.armor}
              onClose={() => setCurrentModal(null)}
            />
          </Suspense>
        );
      case 'gameMode':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <LazyEnhancedGameModes
              currentMode={gameState.gameMode}
              onSelectMode={setGameMode}
              onClose={() => setCurrentModal(null)}
            />
          </Suspense>
        );
      case 'pokyegMarket':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <LazyPokyegMarket
              coins={gameState.coins}
              onPurchaseMythical={purchaseMythical}
              onClose={() => setCurrentModal(null)}
            />
          </Suspense>
        );
      case 'tutorial':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <LazyTutorial
              onClose={() => setCurrentModal(null)}
            />
          </Suspense>
        );
      case 'cheats':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <LazyCheatPanel
              cheats={gameState.cheats}
              onToggleCheat={toggleCheat}
              onGenerateItem={generateCheatItem}
              onClose={() => setCurrentModal(null)}
            />
          </Suspense>
        );
      case 'dailyRewards':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <LazyDailyRewards
              dailyRewards={gameState.dailyRewards}
              onClaimReward={claimDailyReward}
              onClose={() => setCurrentModal(null)}
            />
          </Suspense>
        );
      case 'offlineProgress':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <LazyOfflineProgress
              offlineProgress={gameState.offlineProgress}
              onClaimOfflineRewards={claimOfflineRewards}
              onClose={() => setCurrentModal(null)}
            />
          </Suspense>
        );
      case 'bulkActions':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <LazyBulkActions
              weapons={gameState.inventory.weapons}
              armor={gameState.inventory.armor}
              gems={gameState.gems}
              onBulkSell={bulkSell}
              onBulkUpgrade={bulkUpgrade}
              onClose={() => setCurrentModal(null)}
            />
          </Suspense>
        );
      case 'resetConfirm':
        return (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-red-900 to-gray-900 p-4 sm:p-6 rounded-xl border border-red-500/50 max-w-md w-full backdrop-blur-sm beautiful-container">
              <div className="text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RotateCcw className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <h2 className="text-white font-bold text-lg sm:text-xl mb-4">Reset Game?</h2>
                <p className="text-gray-300 text-sm mb-6">
                  Are you sure you want to reset your game? This will permanently delete all your progress.
                </p>
                <div className="bg-black/30 p-3 rounded-lg mb-6 text-left">
                  <p className="text-red-400 font-bold text-sm mb-2">This action cannot be undone!</p>
                  <ul className="text-red-300 text-xs space-y-1">
                    <li>• All coins, gems, and items will be lost</li>
                    <li>• Zone progress and achievements will be reset</li>
                    <li>• Statistics will be cleared</li>
                    <li>• Character level and skills will be reset</li>
                  </ul>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCurrentModal(null)}
                    className="flex-1 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmReset}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors font-bold text-sm"
                  >
                    Reset Game
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative ${gameState.settings?.snapToGrid ? 'snap-to-grid' : ''} ${gameState.settings?.beautyMode ? 'beauty-mode' : ''}`}>
      <FloatingIcons />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-800 via-violet-800 to-purple-800 shadow-2xl relative z-10 border-b border-purple-500/30">
        <div className="container mx-auto px-4 py-3 sm:py-4 md:py-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white">
                🏰 Hugoland 🗡️
              </h1>
              {gameState.isPremium && (
                <Crown className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 text-yellow-400 animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Only show bulk actions button when not in combat and not on menu page */}
              {!gameState.inCombat && currentView !== 'menu' && (
                <button
                  onClick={() => setCurrentModal('bulkActions')}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-all duration-200 text-xs sm:text-sm shadow-md"
                >
                  <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Bulk</span>
                </button>
              )}
              {/* Hamburger Menu Button */}
              <button
                onClick={() => setCurrentView('menu')}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all duration-200 text-xs sm:text-sm shadow-md"
              >
                <Menu className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Menu</span>
              </button>
            </div>
          </div>
          
          {/* Quick Stats Bar - Hide during combat and on menu page */}
          {!gameState.inCombat && currentView !== 'menu' && (
            <div className="flex justify-center items-center gap-3 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm">
              {gameState.dailyRewards?.availableReward && (
                <button
                  onClick={() => setCurrentModal('dailyRewards')}
                  className="flex items-center gap-1 sm:gap-2 text-green-300 hover:text-green-200 transition-colors animate-pulse px-2 sm:px-3 py-1 rounded-lg hover:bg-white/10"
                >
                  <Gift className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Daily Reward!</span>
                  <span className="sm:hidden">Daily!</span>
                </button>
              )}
            </div>
          )}
          
          {/* Navigation - Disable during combat and hide on menu page */}
          {currentView !== 'menu' && (
            <nav className="flex justify-center">
              <div className="flex space-x-1 sm:space-x-2 bg-black/20 p-1 sm:p-2 rounded-xl backdrop-blur-sm border border-white/10 overflow-x-auto">
                {[
                  { id: 'stats', label: 'Hero', icon: User },
                  { id: 'shop', label: 'Shop', icon: Package },
                  { id: 'inventory', label: 'Inventory', icon: Shield },
                  { id: 'mining', label: 'Mining', icon: Pickaxe },
                  { id: 'merchant', label: 'Merchant', icon: Store },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setCurrentView(id as GameView)}
                    disabled={gameState.inCombat}
                    className={`px-2 sm:px-3 md:px-4 py-1 sm:py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap ${
                      currentView === id
                        ? 'bg-white text-purple-800 shadow-lg'
                        : gameState.inCombat
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-purple-700 text-white hover:bg-purple-600 hover:scale-105'
                    }`}
                  >
                    <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </nav>
          )}

          {/* Menu Page Back Button */}
          {currentView === 'menu' && (
            <div className="flex justify-center">
              <button
                onClick={() => setCurrentView('stats')}
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1 sm:py-2 bg-purple-700 text-white rounded-lg hover:bg-purple-600 transition-all duration-200 shadow-md text-xs sm:text-sm"
              >
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                Back to Game
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-4 sm:py-6 md:py-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {renderCurrentView()}
        </div>
      </div>

      {/* Modals */}
      {renderModal()}
    </div>
  );
}

export default App;