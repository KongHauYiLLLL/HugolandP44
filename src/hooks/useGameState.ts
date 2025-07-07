import { useState, useEffect, useCallback } from 'react';
import { GameState, Weapon, Armor, Enemy, ChestReward, Achievement, PlayerTag, DailyReward, MenuSkill, AdventureSkill, MerchantReward, RelicItem } from '../types/game';
import { generateWeapon, generateArmor, generateEnemy, generateRelicItem, getChestRarityWeights } from '../utils/gameUtils';
import { checkAchievements, initializeAchievements } from '../utils/achievements';
import { checkPlayerTags, initializePlayerTags } from '../utils/playerTags';
import AsyncStorage from '../utils/storage';

const SAVE_KEY = 'hugoland_save_data';
const SAVE_VERSION = '1.0.0';

// Initialize default game state with all required properties
const createDefaultGameState = (): GameState => ({
  coins: 500,
  gems: 50,
  shinyGems: 0,
  zone: 1,
  playerStats: {
    hp: 100,
    maxHp: 100,
    atk: 25,
    def: 15,
    baseAtk: 25,
    baseDef: 15,
    baseHp: 100
  },
  inventory: {
    weapons: [],
    armor: [],
    relics: [],
    currentWeapon: null,
    currentArmor: null,
    equippedRelics: []
  },
  currentEnemy: null,
  inCombat: false,
  combatLog: [],
  isPremium: false,
  achievements: initializeAchievements(),
  collectionBook: {
    weapons: {},
    armor: {},
    totalWeaponsFound: 0,
    totalArmorFound: 0,
    rarityStats: {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0,
      mythical: 0
    }
  },
  knowledgeStreak: {
    current: 0,
    best: 0,
    multiplier: 1
  },
  gameMode: {
    current: 'normal',
    speedModeActive: false,
    survivalLives: 3,
    maxSurvivalLives: 3
  },
  statistics: {
    totalQuestionsAnswered: 0,
    correctAnswers: 0,
    totalPlayTime: 0,
    zonesReached: 1,
    itemsCollected: 0,
    coinsEarned: 0,
    gemsEarned: 0,
    shinyGemsEarned: 0,
    chestsOpened: 0,
    accuracyByCategory: {},
    sessionStartTime: new Date(),
    totalDeaths: 0,
    totalVictories: 0,
    longestStreak: 0,
    fastestVictory: 0,
    totalDamageDealt: 0,
    totalDamageTaken: 0,
    itemsUpgraded: 0,
    itemsSold: 0,
    totalResearchSpent: 0,
    averageAccuracy: 0,
    revivals: 0
  },
  cheats: {
    infiniteCoins: false,
    infiniteGems: false,
    obtainAnyItem: false
  },
  mining: {
    totalGemsMined: 0,
    totalShinyGemsMined: 0
  },
  yojefMarket: {
    items: [],
    lastRefresh: new Date(),
    nextRefresh: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
  },
  playerTags: initializePlayerTags(),
  dailyRewards: {
    lastClaimDate: null,
    currentStreak: 0,
    maxStreak: 0,
    availableReward: null,
    rewardHistory: []
  },
  progression: {
    level: 1,
    experience: 0,
    experienceToNext: 100,
    skillPoints: 0,
    unlockedSkills: [],
    prestigeLevel: 0,
    prestigePoints: 0,
    masteryLevels: {}
  },
  offlineProgress: {
    lastSaveTime: new Date(),
    offlineCoins: 0,
    offlineGems: 0,
    offlineTime: 0,
    maxOfflineHours: 8
  },
  gardenOfGrowth: {
    isPlanted: false,
    plantedAt: null,
    lastWatered: null,
    waterHoursRemaining: 0,
    growthCm: 0,
    totalGrowthBonus: 0,
    seedCost: 1000,
    waterCost: 1000,
    maxGrowthCm: 100
  },
  settings: {
    colorblindMode: false,
    darkMode: true,
    language: 'en',
    notifications: true,
    snapToGrid: false,
    beautyMode: false
  },
  hasUsedRevival: false,
  skills: {
    activeMenuSkill: null,
    lastRollTime: null,
    playTimeThisSession: 0,
    sessionStartTime: new Date()
  },
  adventureSkills: {
    selectedSkill: null,
    availableSkills: [],
    showSelectionModal: false,
    skillEffects: {
      skipCardUsed: false,
      metalShieldUsed: false,
      dodgeUsed: false,
      truthLiesActive: false,
      lightningChainActive: false,
      rampActive: false,
      berserkerActive: false,
      vampiricActive: false,
      phoenixUsed: false,
      timeSlowActive: false,
      criticalStrikeActive: false,
      shieldWallActive: false,
      poisonBladeActive: false,
      arcaneShieldActive: false,
      battleFrenzyActive: false,
      elementalMasteryActive: false,
      shadowStepUsed: false,
      healingAuraActive: false,
      doubleStrikeActive: false,
      manaShieldActive: false,
      berserkRageActive: false,
      divineProtectionUsed: false,
      stormCallActive: false,
      bloodPactActive: false,
      frostArmorActive: false,
      fireballActive: false
    }
  },
  research: {
    level: 1,
    experience: 0,
    experienceToNext: 100,
    totalSpent: 0,
    bonuses: {
      atk: 0,
      def: 0,
      hp: 0,
      coinMultiplier: 1,
      gemMultiplier: 1,
      xpMultiplier: 1
    }
  },
  multipliers: {
    coins: 1,
    gems: 1,
    atk: 1,
    def: 1,
    hp: 1
  },
  merchant: {
    hugollandFragments: 0,
    totalFragmentsEarned: 0,
    lastFragmentZone: 0,
    showRewardModal: false,
    availableRewards: []
  }
});

const useGameState = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Safe state update function
  const safeSetGameState = useCallback((updater: (prevState: GameState) => GameState) => {
    setGameState(prevState => {
      if (!prevState) return null;
      try {
        return updater(prevState);
      } catch (error) {
        console.error('Error updating game state:', error);
        return prevState;
      }
    });
  }, []);

  // Load game state from storage
  const loadGameState = useCallback(async () => {
    try {
      setIsLoading(true);
      const savedData = await AsyncStorage.getItem(SAVE_KEY);
      
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        
        // Validate and merge with default state to ensure all properties exist
        const defaultState = createDefaultGameState();
        const mergedState = {
          ...defaultState,
          ...parsedData,
          // Ensure nested objects are properly merged
          playerStats: {
            ...defaultState.playerStats,
            ...parsedData.playerStats
          },
          inventory: {
            ...defaultState.inventory,
            ...parsedData.inventory
          },
          settings: {
            ...defaultState.settings,
            ...parsedData.settings
          },
          // Convert date strings back to Date objects
          statistics: {
            ...defaultState.statistics,
            ...parsedData.statistics,
            sessionStartTime: new Date(parsedData.statistics?.sessionStartTime || Date.now())
          },
          offlineProgress: {
            ...defaultState.offlineProgress,
            ...parsedData.offlineProgress,
            lastSaveTime: new Date(parsedData.offlineProgress?.lastSaveTime || Date.now())
          }
        };
        
        setGameState(mergedState);
      } else {
        // No saved data, use default state
        setGameState(createDefaultGameState());
      }
    } catch (error) {
      console.error('Error loading game state:', error);
      // If loading fails, use default state
      setGameState(createDefaultGameState());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save game state to storage
  const saveGameState = useCallback(async (state: GameState) => {
    try {
      await AsyncStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving game state:', error);
    }
  }, []);

  // Auto-save when game state changes
  useEffect(() => {
    if (gameState && !isLoading) {
      saveGameState(gameState);
    }
  }, [gameState, isLoading, saveGameState]);

  // Load initial state
  useEffect(() => {
    loadGameState();
  }, [loadGameState]);

  // Calculate total stats including bonuses
  const calculateTotalStats = useCallback((state: GameState) => {
    if (!state || !state.playerStats) return state?.playerStats || createDefaultGameState().playerStats;

    const baseStats = state.playerStats;
    const research = state.research || createDefaultGameState().research;
    const garden = state.gardenOfGrowth || createDefaultGameState().gardenOfGrowth;
    const multipliers = state.multipliers || createDefaultGameState().multipliers;
    
    // Calculate bonuses
    const researchBonus = research.bonuses || { atk: 0, def: 0, hp: 0, coinMultiplier: 1, gemMultiplier: 1, xpMultiplier: 1 };
    const gardenBonus = garden.totalGrowthBonus || 0;
    
    // Apply bonuses
    const totalAtk = Math.floor((baseStats.baseAtk + researchBonus.atk) * (1 + gardenBonus / 100) * multipliers.atk);
    const totalDef = Math.floor((baseStats.baseDef + researchBonus.def) * (1 + gardenBonus / 100) * multipliers.def);
    const totalMaxHp = Math.floor((baseStats.baseHp + researchBonus.hp) * (1 + gardenBonus / 100) * multipliers.hp);
    
    return {
      ...baseStats,
      atk: totalAtk,
      def: totalDef,
      maxHp: totalMaxHp,
      hp: Math.min(baseStats.hp, totalMaxHp) // Don't exceed new max HP
    };
  }, []);

  // Update player stats when bonuses change
  useEffect(() => {
    if (gameState && gameState.playerStats) {
      const newStats = calculateTotalStats(gameState);
      if (newStats.atk !== gameState.playerStats.atk || 
          newStats.def !== gameState.playerStats.def || 
          newStats.maxHp !== gameState.playerStats.maxHp) {
        safeSetGameState(prevState => ({
          ...prevState,
          playerStats: newStats
        }));
      }
    }
  }, [gameState?.research, gameState?.gardenOfGrowth, gameState?.multipliers, calculateTotalStats, safeSetGameState]);

  // Equipment functions
  const equipWeapon = useCallback((weapon: Weapon) => {
    if (!gameState) return;
    
    safeSetGameState(prevState => {
      const newStats = calculateTotalStats(prevState);
      const weaponAtk = weapon.baseAtk + (weapon.level - 1) * 10;
      
      return {
        ...prevState,
        inventory: {
          ...prevState.inventory,
          currentWeapon: weapon
        },
        playerStats: {
          ...newStats,
          atk: newStats.atk + weaponAtk
        }
      };
    });
  }, [gameState, calculateTotalStats, safeSetGameState]);

  const equipArmor = useCallback((armor: Armor) => {
    if (!gameState) return;
    
    safeSetGameState(prevState => {
      const newStats = calculateTotalStats(prevState);
      const armorDef = armor.baseDef + (armor.level - 1) * 5;
      
      return {
        ...prevState,
        inventory: {
          ...prevState.inventory,
          currentArmor: armor
        },
        playerStats: {
          ...newStats,
          def: newStats.def + armorDef
        }
      };
    });
  }, [gameState, calculateTotalStats, safeSetGameState]);

  const upgradeWeapon = useCallback((weaponId: string) => {
    if (!gameState) return;
    
    safeSetGameState(prevState => {
      const weapon = prevState.inventory.weapons.find(w => w.id === weaponId);
      if (!weapon || prevState.gems < weapon.upgradeCost) return prevState;

      const updatedWeapons = prevState.inventory.weapons.map(w =>
        w.id === weaponId
          ? { ...w, level: w.level + 1, upgradeCost: Math.floor(w.upgradeCost * 1.5) }
          : w
      );

      const updatedCurrentWeapon = prevState.inventory.currentWeapon?.id === weaponId
        ? updatedWeapons.find(w => w.id === weaponId) || null
        : prevState.inventory.currentWeapon;

      return {
        ...prevState,
        gems: prevState.gems - weapon.upgradeCost,
        inventory: {
          ...prevState.inventory,
          weapons: updatedWeapons,
          currentWeapon: updatedCurrentWeapon
        },
        statistics: {
          ...prevState.statistics,
          itemsUpgraded: prevState.statistics.itemsUpgraded + 1
        }
      };
    });
  }, [gameState, safeSetGameState]);

  const upgradeArmor = useCallback((armorId: string) => {
    if (!gameState) return;
    
    safeSetGameState(prevState => {
      const armor = prevState.inventory.armor.find(a => a.id === armorId);
      if (!armor || prevState.gems < armor.upgradeCost) return prevState;

      const updatedArmor = prevState.inventory.armor.map(a =>
        a.id === armorId
          ? { ...a, level: a.level + 1, upgradeCost: Math.floor(a.upgradeCost * 1.5) }
          : a
      );

      const updatedCurrentArmor = prevState.inventory.currentArmor?.id === armorId
        ? updatedArmor.find(a => a.id === armorId) || null
        : prevState.inventory.currentArmor;

      return {
        ...prevState,
        gems: prevState.gems - armor.upgradeCost,
        inventory: {
          ...prevState.inventory,
          armor: updatedArmor,
          currentArmor: updatedCurrentArmor
        },
        statistics: {
          ...prevState.statistics,
          itemsUpgraded: prevState.statistics.itemsUpgraded + 1
        }
      };
    });
  }, [gameState, safeSetGameState]);

  const sellWeapon = useCallback((weaponId: string) => {
    if (!gameState) return;
    
    safeSetGameState(prevState => {
      const weapon = prevState.inventory.weapons.find(w => w.id === weaponId);
      if (!weapon || prevState.inventory.currentWeapon?.id === weaponId) return prevState;

      return {
        ...prevState,
        coins: prevState.coins + weapon.sellPrice,
        inventory: {
          ...prevState.inventory,
          weapons: prevState.inventory.weapons.filter(w => w.id !== weaponId)
        },
        statistics: {
          ...prevState.statistics,
          itemsSold: prevState.statistics.itemsSold + 1
        }
      };
    });
  }, [gameState, safeSetGameState]);

  const sellArmor = useCallback((armorId: string) => {
    if (!gameState) return;
    
    safeSetGameState(prevState => {
      const armor = prevState.inventory.armor.find(a => a.id === armorId);
      if (!armor || prevState.inventory.currentArmor?.id === armorId) return prevState;

      return {
        ...prevState,
        coins: prevState.coins + armor.sellPrice,
        inventory: {
          ...prevState.inventory,
          armor: prevState.inventory.armor.filter(a => a.id !== armorId)
        },
        statistics: {
          ...prevState.statistics,
          itemsSold: prevState.statistics.itemsSold + 1
        }
      };
    });
  }, [gameState, safeSetGameState]);

  // Combat functions
  const startCombat = useCallback(() => {
    if (!gameState) return;
    
    safeSetGameState(prevState => {
      const enemy = generateEnemy(prevState.zone);
      return {
        ...prevState,
        currentEnemy: enemy,
        inCombat: true,
        combatLog: [`You encounter a ${enemy.name} in Zone ${prevState.zone}!`]
      };
    });
  }, [gameState, safeSetGameState]);

  const attack = useCallback((hit: boolean, category?: string) => {
    if (!gameState || !gameState.currentEnemy) return;
    
    safeSetGameState(prevState => {
      if (!prevState.currentEnemy) return prevState;
      
      let newState = { ...prevState };
      let logEntry = '';

      if (hit) {
        // Player hits
        const damage = Math.max(1, prevState.playerStats.atk - prevState.currentEnemy.def);
        const newEnemyHp = Math.max(0, prevState.currentEnemy.hp - damage);
        
        newState.currentEnemy = {
          ...prevState.currentEnemy,
          hp: newEnemyHp
        };
        
        logEntry = `You deal ${damage} damage to ${prevState.currentEnemy.name}!`;
        
        // Update knowledge streak
        newState.knowledgeStreak = {
          ...prevState.knowledgeStreak,
          current: prevState.knowledgeStreak.current + 1,
          best: Math.max(prevState.knowledgeStreak.best, prevState.knowledgeStreak.current + 1),
          multiplier: 1 + Math.floor((prevState.knowledgeStreak.current + 1) / 5) * 0.1
        };
        
        // Update statistics
        newState.statistics = {
          ...prevState.statistics,
          correctAnswers: prevState.statistics.correctAnswers + 1,
          totalQuestionsAnswered: prevState.statistics.totalQuestionsAnswered + 1,
          totalDamageDealt: prevState.statistics.totalDamageDealt + damage
        };
        
        // Update category accuracy
        if (category) {
          const categoryStats = prevState.statistics.accuracyByCategory[category] || { correct: 0, total: 0 };
          newState.statistics.accuracyByCategory = {
            ...prevState.statistics.accuracyByCategory,
            [category]: {
              correct: categoryStats.correct + 1,
              total: categoryStats.total + 1
            }
          };
        }
        
        // Check if enemy is defeated
        if (newEnemyHp <= 0) {
          logEntry += ` ${prevState.currentEnemy.name} is defeated!`;
          
          // Calculate rewards
          const baseCoins = 50 + (prevState.zone * 5);
          const baseGems = Math.floor(prevState.zone / 5) + 1;
          const streakMultiplier = newState.knowledgeStreak.multiplier;
          
          const coinsEarned = Math.floor(baseCoins * streakMultiplier);
          const gemsEarned = Math.floor(baseGems * streakMultiplier);
          
          newState.coins = prevState.coins + coinsEarned;
          newState.gems = prevState.gems + gemsEarned;
          newState.zone = prevState.zone + 1;
          newState.inCombat = false;
          newState.currentEnemy = null;
          
          // Check for premium unlock
          if (newState.zone >= 50) {
            newState.isPremium = true;
          }
          
          // Update statistics
          newState.statistics = {
            ...newState.statistics,
            totalVictories: prevState.statistics.totalVictories + 1,
            coinsEarned: prevState.statistics.coinsEarned + coinsEarned,
            gemsEarned: prevState.statistics.gemsEarned + gemsEarned,
            zonesReached: Math.max(prevState.statistics.zonesReached, newState.zone)
          };
          
          logEntry += ` You earned ${coinsEarned} coins and ${gemsEarned} gems!`;
          
          // Reset revival flag for next combat
          newState.hasUsedRevival = false;
        }
      } else {
        // Player misses, enemy attacks
        const damage = Math.max(1, prevState.currentEnemy.atk - prevState.playerStats.def);
        const newPlayerHp = Math.max(0, prevState.playerStats.hp - damage);
        
        newState.playerStats = {
          ...prevState.playerStats,
          hp: newPlayerHp
        };
        
        logEntry = `${prevState.currentEnemy.name} deals ${damage} damage to you!`;
        
        // Reset knowledge streak
        newState.knowledgeStreak = {
          ...prevState.knowledgeStreak,
          current: 0,
          multiplier: 1
        };
        
        // Update statistics
        newState.statistics = {
          ...prevState.statistics,
          totalQuestionsAnswered: prevState.statistics.totalQuestionsAnswered + 1,
          totalDamageTaken: prevState.statistics.totalDamageTaken + damage
        };
        
        // Update category accuracy
        if (category) {
          const categoryStats = prevState.statistics.accuracyByCategory[category] || { correct: 0, total: 0 };
          newState.statistics.accuracyByCategory = {
            ...prevState.statistics.accuracyByCategory,
            [category]: {
              correct: categoryStats.correct,
              total: categoryStats.total + 1
            }
          };
        }
        
        // Check if player is defeated
        if (newPlayerHp <= 0) {
          if (!prevState.hasUsedRevival) {
            // Free revival
            newState.playerStats.hp = prevState.playerStats.maxHp;
            newState.hasUsedRevival = true;
            logEntry += ' You have been revived with full health!';
            newState.statistics.revivals = prevState.statistics.revivals + 1;
          } else {
            // Player is defeated
            logEntry += ' You have been defeated!';
            newState.inCombat = false;
            newState.currentEnemy = null;
            newState.statistics = {
              ...newState.statistics,
              totalDeaths: prevState.statistics.totalDeaths + 1
            };
            
            // Survival mode handling
            if (prevState.gameMode.current === 'survival') {
              newState.gameMode = {
                ...prevState.gameMode,
                survivalLives: Math.max(0, prevState.gameMode.survivalLives - 1)
              };
            }
          }
        }
      }
      
      // Add log entry
      newState.combatLog = [...prevState.combatLog, logEntry].slice(-10);
      
      return newState;
    });
  }, [gameState, safeSetGameState]);

  // Shop functions
  const openChest = useCallback((cost: number): ChestReward | null => {
    if (!gameState || gameState.coins < cost) return null;
    
    let reward: ChestReward | null = null;
    
    safeSetGameState(prevState => {
      if (prevState.coins < cost) return prevState;
      
      const weights = getChestRarityWeights(cost);
      const random = Math.random() * 100;
      let rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythical' = 'common';
      let cumulative = 0;
      
      const rarities: ('common' | 'rare' | 'epic' | 'legendary' | 'mythical')[] = ['common', 'rare', 'epic', 'legendary', 'mythical'];
      
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (random <= cumulative) {
          rarity = rarities[i];
          break;
        }
      }
      
      // Generate items
      const isWeapon = Math.random() < 0.5;
      const items: (Weapon | Armor)[] = [];
      
      if (isWeapon) {
        items.push(generateWeapon(false, rarity));
      } else {
        items.push(generateArmor(false, rarity));
      }
      
      reward = {
        type: isWeapon ? 'weapon' : 'armor',
        items
      };
      
      // Add items to inventory
      const newInventory = { ...prevState.inventory };
      if (isWeapon) {
        newInventory.weapons = [...prevState.inventory.weapons, ...items as Weapon[]];
      } else {
        newInventory.armor = [...prevState.inventory.armor, ...items as Armor[]];
      }
      
      // Update collection book
      const newCollectionBook = { ...prevState.collectionBook };
      items.forEach(item => {
        if (isWeapon) {
          newCollectionBook.weapons[item.name] = true;
          newCollectionBook.totalWeaponsFound += 1;
        } else {
          newCollectionBook.armor[item.name] = true;
          newCollectionBook.totalArmorFound += 1;
        }
        newCollectionBook.rarityStats[item.rarity] += 1;
      });
      
      return {
        ...prevState,
        coins: prevState.coins - cost,
        gems: prevState.gems + Math.floor(Math.random() * 10) + 5, // Bonus gems
        inventory: newInventory,
        collectionBook: newCollectionBook,
        statistics: {
          ...prevState.statistics,
          chestsOpened: prevState.statistics.chestsOpened + 1,
          itemsCollected: prevState.statistics.itemsCollected + items.length
        }
      };
    });
    
    return reward;
  }, [gameState, safeSetGameState]);

  const discardItem = useCallback((itemId: string, type: 'weapon' | 'armor') => {
    if (!gameState) return;
    
    safeSetGameState(prevState => {
      if (type === 'weapon') {
        return {
          ...prevState,
          inventory: {
            ...prevState.inventory,
            weapons: prevState.inventory.weapons.filter(w => w.id !== itemId)
          }
        };
      } else {
        return {
          ...prevState,
          inventory: {
            ...prevState.inventory,
            armor: prevState.inventory.armor.filter(a => a.id !== itemId)
          }
        };
      }
    });
  }, [gameState, safeSetGameState]);

  // Game mode functions
  const setGameMode = useCallback((mode: 'normal' | 'blitz' | 'bloodlust' | 'survival') => {
    if (!gameState) return;
    
    safeSetGameState(prevState => ({
      ...prevState,
      gameMode: {
        ...prevState.gameMode,
        current: mode,
        survivalLives: mode === 'survival' ? 3 : prevState.gameMode.survivalLives,
        maxSurvivalLives: mode === 'survival' ? 3 : prevState.gameMode.maxSurvivalLives
      }
    }));
  }, [gameState, safeSetGameState]);

  // Reset game
  const resetGame = useCallback(() => {
    const newState = createDefaultGameState();
    setGameState(newState);
  }, []);

  // Cheat functions
  const toggleCheat = useCallback((cheat: keyof typeof gameState.cheats) => {
    if (!gameState) return;
    
    safeSetGameState(prevState => ({
      ...prevState,
      cheats: {
        ...prevState.cheats,
        [cheat]: !prevState.cheats[cheat]
      }
    }));
  }, [gameState, safeSetGameState]);

  const generateCheatItem = useCallback(() => {
    if (!gameState) return;
    
    safeSetGameState(prevState => {
      const isWeapon = Math.random() < 0.5;
      const item = isWeapon ? generateWeapon(false, 'mythical') : generateArmor(false, 'mythical');
      
      return {
        ...prevState,
        inventory: {
          ...prevState.inventory,
          weapons: isWeapon ? [...prevState.inventory.weapons, item as Weapon] : prevState.inventory.weapons,
          armor: !isWeapon ? [...prevState.inventory.armor, item as Armor] : prevState.inventory.armor
        }
      };
    });
  }, [gameState, safeSetGameState]);

  // Mining functions
  const mineGem = useCallback((x: number, y: number): { gems: number; shinyGems: number } | null => {
    if (!gameState) return null;
    
    const isShiny = Math.random() < 0.05; // 5% chance for shiny
    const gemsEarned = isShiny ? 0 : 1;
    const shinyGemsEarned = isShiny ? 1 : 0;
    
    safeSetGameState(prevState => ({
      ...prevState,
      gems: prevState.gems + gemsEarned,
      shinyGems: prevState.shinyGems + shinyGemsEarned,
      mining: {
        ...prevState.mining,
        totalGemsMined: prevState.mining.totalGemsMined + gemsEarned,
        totalShinyGemsMined: prevState.mining.totalShinyGemsMined + shinyGemsEarned
      }
    }));
    
    return { gems: gemsEarned, shinyGems: shinyGemsEarned };
  }, [gameState, safeSetGameState]);

  const exchangeShinyGems = useCallback((amount: number): boolean => {
    if (!gameState || gameState.shinyGems < amount) return false;
    
    safeSetGameState(prevState => ({
      ...prevState,
      shinyGems: prevState.shinyGems - amount,
      gems: prevState.gems + (amount * 10)
    }));
    
    return true;
  }, [gameState, safeSetGameState]);

  // Relic functions
  const purchaseRelic = useCallback((relicId: string): boolean => {
    if (!gameState) return false;
    
    const relic = gameState.yojefMarket.items.find(item => item.id === relicId);
    if (!relic || gameState.gems < relic.cost) return false;
    
    safeSetGameState(prevState => ({
      ...prevState,
      gems: prevState.gems - relic.cost,
      inventory: {
        ...prevState.inventory,
        relics: [...prevState.inventory.relics, relic]
      },
      yojefMarket: {
        ...prevState.yojefMarket,
        items: prevState.yojefMarket.items.filter(item => item.id !== relicId)
      }
    }));
    
    return true;
  }, [gameState, safeSetGameState]);

  const upgradeRelic = useCallback((relicId: string) => {
    if (!gameState) return;
    
    safeSetGameState(prevState => {
      const relic = [...prevState.inventory.relics, ...prevState.inventory.equippedRelics]
        .find(r => r.id === relicId);
      
      if (!relic || prevState.gems < relic.upgradeCost) return prevState;
      
      const upgradedRelic = {
        ...relic,
        level: relic.level + 1,
        upgradeCost: Math.floor(relic.upgradeCost * 1.5),
        baseAtk: relic.baseAtk ? relic.baseAtk + 22 : undefined,
        baseDef: relic.baseDef ? relic.baseDef + 15 : undefined
      };
      
      return {
        ...prevState,
        gems: prevState.gems - relic.upgradeCost,
        inventory: {
          ...prevState.inventory,
          relics: prevState.inventory.relics.map(r => 
            r.id === relicId ? upgradedRelic : r
          ),
          equippedRelics: prevState.inventory.equippedRelics.map(r => 
            r.id === relicId ? upgradedRelic : r
          )
        }
      };
    });
  }, [gameState, safeSetGameState]);

  const equipRelic = useCallback((relicId: string) => {
    if (!gameState) return;
    
    safeSetGameState(prevState => {
      const relic = prevState.inventory.relics.find(r => r.id === relicId);
      if (!relic) return prevState;
      
      return {
        ...prevState,
        inventory: {
          ...prevState.inventory,
          relics: prevState.inventory.relics.filter(r => r.id !== relicId),
          equippedRelics: [...prevState.inventory.equippedRelics, relic]
        }
      };
    });
  }, [gameState, safeSetGameState]);

  const unequipRelic = useCallback((relicId: string) => {
    if (!gameState) return;
    
    safeSetGameState(prevState => {
      const relic = prevState.inventory.equippedRelics.find(r => r.id === relicId);
      if (!relic) return prevState;
      
      return {
        ...prevState,
        inventory: {
          ...prevState.inventory,
          relics: [...prevState.inventory.relics, relic],
          equippedRelics: prevState.inventory.equippedRelics.filter(r => r.id !== relicId)
        }
      };
    });
  }, [gameState, safeSetGameState]);

  const sellRelic = useCallback((relicId: string) => {
    if (!gameState) return;
    
    safeSetGameState(prevState => {
      const relic = prevState.inventory.relics.find(r => r.id === relicId);
      if (!relic) return prevState;
      
      const sellPrice = Math.floor(relic.cost * 0.5);
      
      return {
        ...prevState,
        gems: prevState.gems + sellPrice,
        inventory: {
          ...prevState.inventory,
          relics: prevState.inventory.relics.filter(r => r.id !== relicId)
        }
      };
    });
  }, [gameState, safeSetGameState]);

  // Daily rewards
  const claimDailyReward = useCallback((): boolean => {
    if (!gameState || !gameState.dailyRewards.availableReward) return false;
    
    safeSetGameState(prevState => {
      const reward = prevState.dailyRewards.availableReward;
      if (!reward) return prevState;
      
      return {
        ...prevState,
        coins: prevState.coins + reward.coins,
        gems: prevState.gems + reward.gems,
        dailyRewards: {
          ...prevState.dailyRewards,
          availableReward: null,
          lastClaimDate: new Date(),
          currentStreak: prevState.dailyRewards.currentStreak + 1,
          maxStreak: Math.max(prevState.dailyRewards.maxStreak, prevState.dailyRewards.currentStreak + 1),
          rewardHistory: [...prevState.dailyRewards.rewardHistory, { ...reward, claimed: true, claimDate: new Date() }]
        }
      };
    });
    
    return true;
  }, [gameState, safeSetGameState]);

  // Progression functions
  const upgradeSkill = useCallback((skillId: string): boolean => {
    if (!gameState || gameState.progression.skillPoints <= 0) return false;
    
    safeSetGameState(prevState => ({
      ...prevState,
      progression: {
        ...prevState.progression,
        skillPoints: prevState.progression.skillPoints - 1,
        unlockedSkills: [...prevState.progression.unlockedSkills, skillId]
      }
    }));
    
    return true;
  }, [gameState, safeSetGameState]);

  const prestige = useCallback((): boolean => {
    if (!gameState || gameState.progression.level < 50) return false;
    
    safeSetGameState(prevState => {
      const prestigePoints = Math.floor(prevState.progression.level / 10);
      
      return {
        ...prevState,
        progression: {
          ...prevState.progression,
          level: 1,
          experience: 0,
          experienceToNext: 100,
          skillPoints: 0,
          unlockedSkills: [],
          prestigeLevel: prevState.progression.prestigeLevel + 1,
          prestigePoints: prevState.progression.prestigePoints + prestigePoints
        }
      };
    });
    
    return true;
  }, [gameState, safeSetGameState]);

  // Offline progress
  const claimOfflineRewards = useCallback(() => {
    if (!gameState) return;
    
    safeSetGameState(prevState => ({
      ...prevState,
      coins: prevState.coins + prevState.offlineProgress.offlineCoins,
      gems: prevState.gems + prevState.offlineProgress.offlineGems,
      offlineProgress: {
        ...prevState.offlineProgress,
        offlineCoins: 0,
        offlineGems: 0,
        offlineTime: 0
      }
    }));
  }, [gameState, safeSetGameState]);

  // Bulk actions
  const bulkSell = useCallback((itemIds: string[], type: 'weapon' | 'armor') => {
    if (!gameState) return;
    
    safeSetGameState(prevState => {
      let totalValue = 0;
      
      if (type === 'weapon') {
        const itemsToSell = prevState.inventory.weapons.filter(w => 
          itemIds.includes(w.id) && prevState.inventory.currentWeapon?.id !== w.id
        );
        totalValue = itemsToSell.reduce((sum, item) => sum + item.sellPrice, 0);
        
        return {
          ...prevState,
          coins: prevState.coins + totalValue,
          inventory: {
            ...prevState.inventory,
            weapons: prevState.inventory.weapons.filter(w => !itemIds.includes(w.id))
          }
        };
      } else {
        const itemsToSell = prevState.inventory.armor.filter(a => 
          itemIds.includes(a.id) && prevState.inventory.currentArmor?.id !== a.id
        );
        totalValue = itemsToSell.reduce((sum, item) => sum + item.sellPrice, 0);
        
        return {
          ...prevState,
          coins: prevState.coins + totalValue,
          inventory: {
            ...prevState.inventory,
            armor: prevState.inventory.armor.filter(a => !itemIds.includes(a.id))
          }
        };
      }
    });
  }, [gameState, safeSetGameState]);

  const bulkUpgrade = useCallback((itemIds: string[], type: 'weapon' | 'armor') => {
    if (!gameState) return;
    
    safeSetGameState(prevState => {
      if (type === 'weapon') {
        const itemsToUpgrade = prevState.inventory.weapons.filter(w => itemIds.includes(w.id));
        const totalCost = itemsToUpgrade.reduce((sum, item) => sum + item.upgradeCost, 0);
        
        if (prevState.gems < totalCost) return prevState;
        
        return {
          ...prevState,
          gems: prevState.gems - totalCost,
          inventory: {
            ...prevState.inventory,
            weapons: prevState.inventory.weapons.map(w => 
              itemIds.includes(w.id) 
                ? { ...w, level: w.level + 1, upgradeCost: Math.floor(w.upgradeCost * 1.5) }
                : w
            )
          }
        };
      } else {
        const itemsToUpgrade = prevState.inventory.armor.filter(a => itemIds.includes(a.id));
        const totalCost = itemsToUpgrade.reduce((sum, item) => sum + item.upgradeCost, 0);
        
        if (prevState.gems < totalCost) return prevState;
        
        return {
          ...prevState,
          gems: prevState.gems - totalCost,
          inventory: {
            ...prevState.inventory,
            armor: prevState.inventory.armor.map(a => 
              itemIds.includes(a.id) 
                ? { ...a, level: a.level + 1, upgradeCost: Math.floor(a.upgradeCost * 1.5) }
                : a
            )
          }
        };
      }
    });
  }, [gameState, safeSetGameState]);

  // Garden functions
  const plantSeed = useCallback((): boolean => {
    if (!gameState || gameState.coins < gameState.gardenOfGrowth.seedCost || gameState.gardenOfGrowth.isPlanted) {
      return false;
    }
    
    safeSetGameState(prevState => ({
      ...prevState,
      coins: prevState.coins - prevState.gardenOfGrowth.seedCost,
      gardenOfGrowth: {
        ...prevState.gardenOfGrowth,
        isPlanted: true,
        plantedAt: new Date(),
        lastWatered: new Date(),
        waterHoursRemaining: 24
      }
    }));
    
    return true;
  }, [gameState, safeSetGameState]);

  const buyWater = useCallback((hours: number): boolean => {
    if (!gameState || !gameState.gardenOfGrowth.isPlanted) return false;
    
    const cost = Math.floor((hours / 24) * gameState.gardenOfGrowth.waterCost);
    if (gameState.coins < cost) return false;
    
    safeSetGameState(prevState => ({
      ...prevState,
      coins: prevState.coins - cost,
      gardenOfGrowth: {
        ...prevState.gardenOfGrowth,
        waterHoursRemaining: prevState.gardenOfGrowth.waterHoursRemaining + hours,
        lastWatered: new Date()
      }
    }));
    
    return true;
  }, [gameState, safeSetGameState]);

  // Settings
  const updateSettings = useCallback((newSettings: Partial<typeof gameState.settings>) => {
    if (!gameState) return;
    
    safeSetGameState(prevState => ({
      ...prevState,
      settings: {
        ...prevState.settings,
        ...newSettings
      }
    }));
  }, [gameState, safeSetGameState]);

  // Dev tools
  const addCoins = useCallback((amount: number) => {
    if (!gameState) return;
    
    safeSetGameState(prevState => ({
      ...prevState,
      coins: prevState.coins + amount
    }));
  }, [gameState, safeSetGameState]);

  const addGems = useCallback((amount: number) => {
    if (!gameState) return;
    
    safeSetGameState(prevState => ({
      ...prevState,
      gems: prevState.gems + amount
    }));
  }, [gameState, safeSetGameState]);

  const teleportToZone = useCallback((zone: number) => {
    if (!gameState) return;
    
    safeSetGameState(prevState => ({
      ...prevState,
      zone: Math.max(1, zone),
      statistics: {
        ...prevState.statistics,
        zonesReached: Math.max(prevState.statistics.zonesReached, zone)
      }
    }));
  }, [gameState, safeSetGameState]);

  const setExperience = useCallback((xp: number) => {
    if (!gameState) return;
    
    safeSetGameState(prevState => ({
      ...prevState,
      progression: {
        ...prevState.progression,
        experience: Math.max(0, xp)
      }
    }));
  }, [gameState, safeSetGameState]);

  // Skills
  const rollSkill = useCallback((): boolean => {
    if (!gameState || gameState.coins < 100) return false;
    
    // Generate random skill
    const skillTypes = [
      'coin_vacuum', 'treasurer', 'xp_surge', 'luck_gem', 'enchanter',
      'time_warp', 'golden_touch', 'knowledge_boost', 'durability_master',
      'relic_finder', 'stat_amplifier'
    ];
    
    const randomType = skillTypes[Math.floor(Math.random() * skillTypes.length)];
    const duration = Math.floor(Math.random() * 12) + 1; // 1-12 hours
    
    const newSkill: MenuSkill = {
      id: Math.random().toString(36).substr(2, 9),
      name: randomType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      description: `A powerful skill that lasts ${duration} hours`,
      duration,
      activatedAt: new Date(),
      expiresAt: new Date(Date.now() + duration * 60 * 60 * 1000),
      type: randomType as any
    };
    
    safeSetGameState(prevState => ({
      ...prevState,
      coins: prevState.coins - 100,
      skills: {
        ...prevState.skills,
        activeMenuSkill: newSkill,
        lastRollTime: new Date()
      }
    }));
    
    return true;
  }, [gameState, safeSetGameState]);

  // Adventure skills
  const selectAdventureSkill = useCallback((skill: AdventureSkill) => {
    if (!gameState) return;
    
    safeSetGameState(prevState => ({
      ...prevState,
      adventureSkills: {
        ...prevState.adventureSkills,
        selectedSkill: skill,
        showSelectionModal: false,
        availableSkills: []
      }
    }));
  }, [gameState, safeSetGameState]);

  const skipAdventureSkills = useCallback(() => {
    if (!gameState) return;
    
    safeSetGameState(prevState => ({
      ...prevState,
      adventureSkills: {
        ...prevState.adventureSkills,
        selectedSkill: null,
        showSelectionModal: false,
        availableSkills: []
      }
    }));
  }, [gameState, safeSetGameState]);

  const useSkipCard = useCallback(() => {
    if (!gameState) return;
    
    safeSetGameState(prevState => ({
      ...prevState,
      adventureSkills: {
        ...prevState.adventureSkills,
        skillEffects: {
          ...prevState.adventureSkills.skillEffects,
          skipCardUsed: true
        }
      }
    }));
  }, [gameState, safeSetGameState]);

  // Merchant
  const spendFragments = useCallback((): boolean => {
    if (!gameState || gameState.merchant.hugollandFragments < 5) return false;
    
    // Generate random rewards
    const rewards: MerchantReward[] = [
      {
        id: '1',
        type: 'coins',
        name: 'Coin Treasure',
        description: 'A large amount of coins',
        icon: '💰',
        coins: 5000 + Math.floor(Math.random() * 5000)
      },
      {
        id: '2',
        type: 'gems',
        name: 'Gem Collection',
        description: 'Precious gems',
        icon: '💎',
        gems: 500 + Math.floor(Math.random() * 500)
      },
      {
        id: '3',
        type: 'item',
        name: 'Legendary Item',
        description: 'A powerful legendary item',
        icon: '⭐',
        item: Math.random() < 0.5 ? generateWeapon(false, 'legendary') : generateArmor(false, 'legendary')
      }
    ];
    
    safeSetGameState(prevState => ({
      ...prevState,
      merchant: {
        ...prevState.merchant,
        hugollandFragments: prevState.merchant.hugollandFragments - 5,
        showRewardModal: true,
        availableRewards: rewards
      }
    }));
    
    return true;
  }, [gameState, safeSetGameState]);

  const selectMerchantReward = useCallback((reward: MerchantReward) => {
    if (!gameState) return;
    
    safeSetGameState(prevState => {
      let newState = { ...prevState };
      
      // Apply reward
      if (reward.coins) {
        newState.coins += reward.coins;
      }
      if (reward.gems) {
        newState.gems += reward.gems;
      }
      if (reward.item) {
        if ('baseAtk' in reward.item) {
          newState.inventory.weapons.push(reward.item as Weapon);
        } else {
          newState.inventory.armor.push(reward.item as Armor);
        }
      }
      
      // Close modal
      newState.merchant = {
        ...prevState.merchant,
        showRewardModal: false,
        availableRewards: []
      };
      
      return newState;
    });
  }, [gameState, safeSetGameState]);

  // Mythical purchase (placeholder)
  const purchaseMythical = useCallback((cost: number): boolean => {
    if (!gameState || gameState.coins < cost) return false;
    
    safeSetGameState(prevState => ({
      ...prevState,
      coins: prevState.coins - cost
    }));
    
    return true;
  }, [gameState, safeSetGameState]);

  return {
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
    selectMerchantReward
  };
};

export default useGameState;