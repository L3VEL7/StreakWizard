const { GuildConfig, Streak, ServerConfig, RaidHistory } = require('../database/models');
const { Sequelize, Op } = require('sequelize');
const sequelize = require('../database/config');

// Define milestone levels
const MILESTONES = [
    { level: 10, emoji: '🌟' },
    { level: 25, emoji: '⭐' },
    { level: 50, emoji: '🌙' },
    { level: 100, emoji: '🌠' },
    { level: 250, emoji: '🌌' },
    { level: 500, emoji: '🎯' },
    { level: 1000, emoji: '🏆' }
];

// Define streak streak milestones
const STREAK_STREAK_MILESTONES = [
    { level: 7, emoji: '📅' },
    { level: 14, emoji: '📆' },
    { level: 30, emoji: '📊' },
    { level: 60, emoji: '📈' },
    { level: 90, emoji: '📉' },
    { level: 180, emoji: '📋' },
    { level: 365, emoji: '📅' }
];

// Initialize RaidHistory table
setTimeout(async () => {
    try {
        const streakManager = module.exports;
        await streakManager.ensureRaidHistoryTable();
        console.log('RaidHistory table initialized on startup');
    } catch (error) {
        console.error('Failed to initialize RaidHistory table on startup:', error);
    }
}, 5000); // Wait 5 seconds to ensure database connection is established

module.exports = {
    async setTriggerWords(guildId, words) {
        if (!Array.isArray(words)) {
            console.error('Invalid input: words must be an array');
            throw new Error('Invalid input: words must be an array');
        }

        // Enhanced validation and processing of words
        const processedWords = words
            .filter(word => word && typeof word === 'string')
            .map(word => word.toLowerCase().trim())
            .filter(word => word.length > 0);

        if (processedWords.length === 0) {
            console.error('No valid words provided');
            throw new Error('No valid words provided');
        }

        console.log(`Setting trigger words for guild ${guildId}:`, processedWords);

        try {
            // Get existing config first
            let config = await GuildConfig.findByPk(guildId);
            const existingWords = config ? config.triggerWords : [];
            
            // Combine existing and new words, removing duplicates
            const combinedWords = [...new Set([...existingWords, ...processedWords])];
            
            [config] = await GuildConfig.upsert({
                guildId,
                triggerWords: combinedWords
            }, {
                returning: true
            });

            console.log('Successfully saved trigger words. Current config:', config.toJSON());
            return processedWords;
        } catch (error) {
            console.error('Error saving trigger words:', error);
            throw error;
        }
    },

    // Special function for profile command that directly queries the database
    async getTriggerWordsForProfile(guildId) {
        try {
            // First try the normal way
            const words = await this.getTriggerWords(guildId);
            if (words && words.length > 0) {
                return words;
            }
            
            // If that fails, try a direct SQL query
            const result = await sequelize.query(
                `SELECT "triggerWords" FROM "GuildConfigs" WHERE "guildId" = :guildId`,
                {
                    replacements: { guildId },
                    type: sequelize.QueryTypes.SELECT,
                    raw: true
                }
            );
            
            if (result && result.length > 0 && result[0].triggerWords) {
                const words = result[0].triggerWords;
                console.log(`Direct SQL query for trigger words for guild ${guildId}:`, words);
                return Array.isArray(words) ? words : [];
            }
            
            // If still nothing, check if there are any streaks with trigger words
            const streakWords = await sequelize.query(
                `SELECT DISTINCT "triggerWord" FROM "Streaks" WHERE "guildId" = :guildId`,
                {
                    replacements: { guildId },
                    type: sequelize.QueryTypes.SELECT,
                    raw: true
                }
            );
            
            if (streakWords && streakWords.length > 0) {
                const words = streakWords.map(w => w.triggerWord);
                console.log(`Found trigger words from streaks for guild ${guildId}:`, words);
                
                // Save these words back to the guild config
                try {
                    await GuildConfig.upsert({
                        guildId,
                        triggerWords: words
                    });
                } catch (saveError) {
                    console.error(`Error saving recovered trigger words:`, saveError);
                    // Continue even if save fails
                }
                
                return words;
            }
            
            // If we still couldn't find anything, return empty array
            return [];
        } catch (error) {
            console.error(`Error in getTriggerWordsForProfile for guild ${guildId}:`, error);
            return [];
        }
    },

    async getTriggerWords(guildId) {
        // For safety, redirect this to the specialized function if it's being called from profile.js
        const stack = new Error().stack;
        if (stack && stack.includes('profile.js')) {
            return this.getTriggerWordsForProfile(guildId);
        }

        try {
            console.log(`[DEBUG] Fetching trigger words for guild ${guildId}...`);
            
            // First try direct SQL query to see what's in the database
            try {
                const rawResult = await sequelize.query(
                    `SELECT "triggerWords" FROM "GuildConfigs" WHERE "guildId" = :guildId`,
                    {
                        replacements: { guildId },
                        type: sequelize.QueryTypes.SELECT,
                        raw: true
                    }
                );
                console.log(`[DEBUG] Raw SQL result for trigger words:`, JSON.stringify(rawResult));
            } catch (sqlError) {
                console.error(`[DEBUG] SQL error fetching trigger words:`, sqlError);
            }
            
            const config = await GuildConfig.findByPk(guildId);
            console.log(`[DEBUG] Retrieved config for guild ${guildId}:`, 
                config ? JSON.stringify(config.toJSON()) : 'null');

            if (!config) {
                console.log(`[DEBUG] No config found for guild ${guildId}`);
                return [];
            }

            // Get the raw value first to check for potential corruption
            const rawTriggerWords = config.getDataValue('triggerWords');
            console.log(`[DEBUG] Raw triggerWords value:`, typeof rawTriggerWords, JSON.stringify(rawTriggerWords));
            
            // Ensure triggerWords is always an array
            const words = Array.isArray(rawTriggerWords) 
                ? rawTriggerWords.filter(word => word && typeof word === 'string') 
                : [];
                
            console.log(`[DEBUG] Processed trigger words for guild ${guildId}:`, JSON.stringify(words));
            
            // If words array is empty but we had raw data, there might be corruption
            if (words.length === 0 && rawTriggerWords && typeof rawTriggerWords === 'string') {
                // Try to recover by parsing the string
                console.log(`[DEBUG] Attempting to recover trigger words from string`);
                try {
                    // Try comma-separated values
                    const recoveredWords = rawTriggerWords.split(',')
                        .map(w => w.trim().toLowerCase())
                        .filter(w => w.length > 0);
                        
                    if (recoveredWords.length > 0) {
                        console.log(`[DEBUG] Recovered words from string:`, JSON.stringify(recoveredWords));
                        
                        // Save these back to the database
                        try {
                            await GuildConfig.upsert({
                                guildId,
                                triggerWords: recoveredWords
                            });
                            console.log(`[DEBUG] Saved recovered trigger words to database`);
                        } catch (saveError) {
                            console.error(`[DEBUG] Error saving recovered trigger words:`, saveError);
                        }
                        
                        return recoveredWords;
                    }
                } catch (parseError) {
                    console.error(`[DEBUG] Error recovering trigger words:`, parseError);
                }
            }
            
            return words;
        } catch (error) {
            console.error(`[DEBUG] Error getting trigger words for guild ${guildId}:`, error);
            return [];
        }
    },

    async removeTriggerWords(guildId, words) {
        if (!Array.isArray(words)) {
            throw new Error('Invalid input: words must be an array');
        }

        const processedWords = words
            .filter(word => word && typeof word === 'string')
            .map(word => word.toLowerCase().trim())
            .filter(word => word.length > 0);

        if (processedWords.length === 0) {
            throw new Error('No valid words provided');
        }

        try {
            const config = await GuildConfig.findByPk(guildId);
            if (!config) {
                throw new Error('No configuration found for this guild');
            }

            const existingWords = config.triggerWords;
            const updatedWords = existingWords.filter(word => !processedWords.includes(word));

            await config.update({
                triggerWords: updatedWords
            });

            return updatedWords;
        } catch (error) {
            console.error('Error removing trigger words:', error);
            throw error;
        }
    },

    async isValidTriggerWord(guildId, word) {
        if (!word || typeof word !== 'string') {
            return false;
        }

        const words = await this.getTriggerWords(guildId);
        const processedWord = word.toLowerCase().trim();
        return words.includes(processedWord);
    },

    async setStreakLimit(guildId, minutes) {
        await GuildConfig.upsert({
            guildId,
            streakLimit: minutes
        });
    },

    async getStreakLimit(guildId) {
        const config = await GuildConfig.findByPk(guildId);
        return config ? config.streakLimit : 0;
    },

    async canUpdateStreak(guildId, userId, word) {
        const limit = await this.getStreakLimit(guildId);
        if (limit === 0) return true;

        const streak = await Streak.findOne({
            where: {
                guildId,
                userId,
                triggerWord: word.trim().toLowerCase()
            }
        });

        if (!streak) return true;

        const now = new Date();
        const timeDiff = (now - streak.lastUpdated) / (1000 * 60); // Convert to minutes
        return timeDiff >= limit;
    },

    async isStreakStreakEnabled(guildId) {
        const config = await GuildConfig.findByPk(guildId);
        return config ? config.streakStreakEnabled : true; // Default to true if not set
    },

    async isGamblingEnabled(guildId) {
        const config = await GuildConfig.findByPk(guildId);
        return config ? config.gamblingEnabled : false; // Default to false if not set
    },

    async setGamblingEnabled(guildId, enabled) {
        await GuildConfig.upsert({
            guildId,
            gamblingEnabled: enabled
        });
    },

    async isRaidEnabled(guildId) {
        try {
            guildId = String(guildId);
            
            const config = await GuildConfig.findOne({
                where: { guildId },
                attributes: ['raidEnabled']
            });
            
            return config ? Boolean(config.raidEnabled) : false;
        } catch (error) {
            console.error('Error checking if raid system is enabled:', error);
            return false;
        }
    },

    async setRaidEnabled(guildId, enabled) {
        try {
            guildId = String(guildId);
            
            const [config, created] = await GuildConfig.upsert({
                guildId,
                raidEnabled: Boolean(enabled)
            }, {
                returning: true
            });
            
            console.log(`Raid system ${enabled ? 'enabled' : 'disabled'} for guild ${guildId}`);
            return true;
        } catch (error) {
            console.error(`Error ${enabled ? 'enabling' : 'disabling'} raid system:`, error);
            return false;
        }
    },

    async getRaidConfig(guildId) {
        try {
            guildId = String(guildId);
            
            // Get guild config
            const guildConfig = await GuildConfig.findOne({
                where: { guildId }
            });
            
            if (!guildConfig) {
                return {
                    enabled: false,
                    entryThreshold: 25,
                    minEntryStreak: 10,
                    stealPercentage: 20,
                    minStealAmount: 5,
                    maxStealAmount: 30,
                    riskPercentage: 15,
                    minRiskAmount: 3,
                    maxRiskAmount: 20,
                    successChance: 50,
                    successCooldownHours: 4,
                    failureCooldownHours: 2
                };
            }
            
            // Create raid config from guild settings or use defaults
            return {
                enabled: guildConfig.raidEnabled || false,
                entryThreshold: 25,
                minEntryStreak: 10,
                stealPercentage: 20,
                minStealAmount: guildConfig.raidMinStealAmount || 5,
                maxStealAmount: guildConfig.raidMaxStealAmount || 30,
                riskPercentage: guildConfig.raidRiskPercent || 15,
                minRiskAmount: guildConfig.raidMinRiskAmount || 3,
                maxRiskAmount: guildConfig.raidMaxRiskAmount || 20,
                successChance: guildConfig.raidSuccessChance !== undefined ? guildConfig.raidSuccessChance : 50,
                successCooldownHours: guildConfig.raidSuccessCooldownHours || 4,
                failureCooldownHours: guildConfig.raidFailureCooldownHours || 2
            };
        } catch (error) {
            console.error('Error in getRaidConfig:', error);
            // Return default config on error
            return {
                enabled: false,
                entryThreshold: 25,
                minEntryStreak: 10,
                stealPercentage: 20,
                minStealAmount: 5,
                maxStealAmount: 30,
                riskPercentage: 15,
                minRiskAmount: 3,
                maxRiskAmount: 20,
                successChance: 50,
                successCooldownHours: 4,
                failureCooldownHours: 2
            };
        }
    },

    async setRaidConfig(guildId, config) {
        try {
            guildId = String(guildId);
            
            // Update guild config with raid settings
            await GuildConfig.upsert({
                guildId,
                raidEnabled: config.enabled !== undefined ? config.enabled : false,
                raidMaxStealPercent: config.maxStealPercent || config.stealPercentage || 20,
                raidRiskPercent: config.riskPercent || config.riskPercentage || 15,
                raidSuccessChance: config.successChance || 50,
                raidMinStealAmount: config.minStealAmount || 5,
                raidMaxStealAmount: config.maxStealAmount || 30,
                raidMinRiskAmount: config.minRiskAmount || 3,
                raidMaxRiskAmount: config.maxRiskAmount || 20,
                raidSuccessCooldownHours: config.successCooldownHours || 4,
                raidFailureCooldownHours: config.failureCooldownHours || 2
            });
            
            return true;
        } catch (error) {
            console.error('Error in setRaidConfig:', error);
            return false;
        }
    },

    async canRaid(guildId, userId) {
        try {
            // Use the more robust getRemainingRaidTime function
            const raidTimeInfo = await this.getRemainingRaidTime(guildId, userId);
            return raidTimeInfo.canRaid;
        } catch (error) {
            console.error('Error in canRaid:', error);
            // If there was an error, allow the raid
            return true;
        }
    },

    async gambleStreak(guildId, userId, word, percentage, choice) {
        try {
            // Validate parameters
            guildId = String(guildId);
            userId = String(userId);
            word = String(word || '').toLowerCase().trim();
            
            // Ensure percentage is a valid number between 0-100
            let validPercentage = Number(percentage);
            if (isNaN(validPercentage) || validPercentage <= 0) {
                return { success: false, message: 'Invalid gamble percentage. Must be a positive number.' };
            }
            
            // Cap at 100% if someone tries to go higher
            validPercentage = Math.min(100, validPercentage);
            
            // Validate choice is either 'double' or 'half'
            if (choice !== 'double' && choice !== 'half') {
                return { success: false, message: 'Invalid choice. Must be either "double" or "half".' };
            }
            
            // Get gambling config
            const config = await this.getGamblingConfig(guildId);
            if (!config || !config.enabled) {
                return { success: false, message: 'Gambling is not enabled on this server.' };
            }
            
            // Check if percentage is above max allowed
            const maxPercentage = config.maxGamblePercentage || 50;
            if (validPercentage > maxPercentage) {
                return { 
                    success: false, 
                    message: `Gamble percentage cannot exceed ${maxPercentage}%. Please choose a lower percentage.` 
                };
            }
            
            // Find the user's streak for this word
            const streak = await Streak.findOne({
                where: {
                    guildId,
                    userId,
                    word
                }
            });
            
            if (!streak) {
                return { success: false, message: `You don't have a streak for '${word}' to gamble with.` };
            }
            
            const currentStreak = streak.count;
            if (currentStreak <= 0) {
                return { success: false, message: `You need a positive streak to gamble. Your current streak is ${currentStreak}.` };
            }
            
            // Calculate amount to gamble (rounded to nearest integer)
            const gambleAmount = Math.round((validPercentage / 100) * currentStreak);
            if (gambleAmount <= 0) {
                return { success: false, message: 'Gamble amount is too small. Please use a higher percentage or build a larger streak.' };
            }
            
            // Get success chance from config (default to 50% if not set)
            const successChance = config.successChance !== undefined ? config.successChance : 50;
            
            // Determine if gamble is successful
            const random = Math.random() * 100;
            const isSuccess = random <= successChance;
            
            let newStreakCount;
            let resultMessage;
            
            if (isSuccess) {
                if (choice === 'double') {
                    newStreakCount = currentStreak + gambleAmount;
                    resultMessage = `Success! You doubled ${gambleAmount} streaks (${validPercentage}% of your current streak). Your streak for '${word}' is now ${newStreakCount}.`;
                } else {
                    // 'half' - player risked less for a smaller reward
                    const halfGambleAmount = Math.ceil(gambleAmount / 2);
                    newStreakCount = currentStreak + halfGambleAmount;
                    resultMessage = `Success! You gained ${halfGambleAmount} streaks (half of your ${validPercentage}% gamble). Your streak for '${word}' is now ${newStreakCount}.`;
                }
            } else {
                if (choice === 'double') {
                    newStreakCount = Math.max(0, currentStreak - gambleAmount);
                    resultMessage = `Failed! You lost ${gambleAmount} streaks (${validPercentage}% of your streak). Your streak for '${word}' is now ${newStreakCount}.`;
                } else {
                    // 'half' - player risked less, so loses less
                    const halfGambleAmount = Math.ceil(gambleAmount / 2);
                    newStreakCount = Math.max(0, currentStreak - halfGambleAmount);
                    resultMessage = `Failed! You lost ${halfGambleAmount} streaks (half of your ${validPercentage}% gamble). Your streak for '${word}' is now ${newStreakCount}.`;
                }
            }
            
            // Update the streak in the database
            await streak.update({ count: newStreakCount });
            
            return {
                success: true,
                result: isSuccess,
                message: resultMessage,
                oldStreak: currentStreak,
                newStreak: newStreakCount,
                difference: newStreakCount - currentStreak,
                gambleAmount: gambleAmount,
                percentageUsed: validPercentage
            };
        } catch (error) {
            console.error('Error in gambleStreak:', error);
            return { success: false, message: `An error occurred while gambling: ${error.message}` };
        }
    },

    async incrementStreak(guildId, userId, word) {
        try {
            const processedWord = word.trim().toLowerCase();

            // Check if streak can be updated
            if (!await this.canUpdateStreak(guildId, userId, processedWord)) {
                return -1;
            }

            // Get or create streak with a single database operation
            const [streak, created] = await Streak.findOrCreate({
                where: {
                    guildId,
                    userId,
                    triggerWord: processedWord
                },
                defaults: {
                    count: 1,
                    streakStreak: 1,
                    lastStreakDate: new Date().toISOString().split('T')[0],
                    lastUpdated: new Date()
                }
            });

            if (created) {
                return { 
                    count: streak.count,
                    streakStreak: streak.streakStreak
                };
            }

            // Update existing streak
            const oldCount = streak.count;
            const today = new Date().toISOString().split('T')[0];
            
            // Update streak streak only if enabled
            if (await this.isStreakStreakEnabled(guildId)) {
                if (streak.lastStreakDate) {
                    const lastDate = new Date(streak.lastStreakDate);
                    const currentDate = new Date(today);
                    const daysDiff = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
                    
                    if (daysDiff === 1) {
                        streak.streakStreak += 1;
                    } else if (daysDiff > 1) {
                        streak.streakStreak = 1;
                    }
                } else {
                    streak.streakStreak = 1;
                }
                streak.lastStreakDate = today;
            }
            
            streak.count += 1;
            streak.lastUpdated = new Date();
            await streak.save();

            // Prepare result object
            const result = {
                count: streak.count,
                streakStreak: streak.streakStreak
            };

            // Check for milestone achievement
            const milestone = MILESTONES.find(m => m.level === streak.count);
            if (milestone) {
                result.milestone = {
                    level: milestone.level,
                    emoji: milestone.emoji
                };
            }

            // Check for streak streak milestone only if enabled
            if (await this.isStreakStreakEnabled(guildId)) {
                const streakStreakMilestone = STREAK_STREAK_MILESTONES.find(m => m.level === streak.streakStreak);
                if (streakStreakMilestone) {
                    result.streakStreakMilestone = {
                        level: streakStreakMilestone.level,
                        emoji: streakStreakMilestone.emoji
                    };
                }
            }

            return result;
        } catch (error) {
            console.error('Error in incrementStreak:', error);
            throw new Error('Failed to update streak');
        }
    },

    async getStreaks(guildId, word = null) {
        const whereClause = {
            guildId
        };
        
        if (word) {
            whereClause.triggerWord = word.trim().toLowerCase();
        }

        const streaks = await Streak.findAll({
            where: whereClause
        });

        return streaks.reduce((acc, streak) => {
            if (!acc[streak.triggerWord]) {
                acc[streak.triggerWord] = {};
            }
            acc[streak.triggerWord][streak.userId] = streak.count;
            return acc;
        }, {});
    },

    // Special function for gambling that manually builds the query to avoid issues with missing columns
    async getUserStreaksForGambling(guildId, userId) {
        try {
            // Manually construct a query that only selects columns we know exist
            const streaks = await sequelize.query(
                `SELECT id, "guildId", "userId", "triggerWord", count, "bestStreak", "streakStreak", "lastStreakDate", "lastUpdated", "createdAt", "updatedAt" 
                FROM "Streaks" 
                WHERE "guildId" = :guildId AND "userId" = :userId 
                ORDER BY count DESC`,
                {
                    replacements: { guildId, userId },
                    type: sequelize.QueryTypes.SELECT,
                    raw: true
                }
            );

            return streaks.map(streak => ({
                trigger: streak.triggerWord,
                count: streak.count,
                best_streak: streak.bestStreak || streak.count,
                lastUpdated: streak.lastUpdated
            }));
        } catch (error) {
            console.error('Error in getUserStreaksForGambling:', error);
            // Return empty array in case of error to prevent failures
            return [];
        }
    },

    // New function to get user's streaks
    async getUserStreaks(guildId, userId) {
        // For safety, redirect this to the specialized function if it's being called from gamble.js
        const stack = new Error().stack;
        if (stack && stack.includes('gamble.js')) {
            return this.getUserStreaksForGambling(guildId, userId);
        }

        try {
            // Use specific column selection to avoid issues with missing columns
            const streaks = await Streak.findAll({
                where: {
                    guildId,
                    userId
                },
                attributes: [
                    'id', 'guildId', 'userId', 'triggerWord', 
                    'count', 'bestStreak', 'streakStreak', 
                    'lastStreakDate', 'lastUpdated'
                    // Intentionally omit lastRaidDate to avoid errors
                ],
                order: [['count', 'DESC']]
            });

            return streaks.map(streak => ({
                trigger: streak.triggerWord,
                count: streak.count,
                best_streak: streak.bestStreak || streak.count,
                lastUpdated: streak.lastUpdated
            }));
        } catch (error) {
            console.error('Error in getUserStreaks:', error);
            // Return empty array in case of error to prevent failures
            return [];
        }
    },

    // New function to reset user's streaks
    async resetUserStreaks(guildId, userId) {
        await Streak.destroy({
            where: {
                guildId,
                userId
            }
        });
    },

    // New function to reset trigger word streaks
    async resetTriggerStreaks(guildId, triggerWord) {
        await Streak.destroy({
            where: {
                guildId,
                triggerWord: triggerWord.toLowerCase().trim()
            }
        });
    },

    // New function to get server statistics
    async getServerStats(guildId) {
        const stats = await Streak.findAll({
            where: { guildId },
            attributes: [
                'triggerWord',
                [sequelize.fn('COUNT', sequelize.col('userId')), 'active_users'],
                [sequelize.fn('SUM', sequelize.col('count')), 'total_streaks'],
                [sequelize.fn('AVG', sequelize.col('count')), 'average_streak']
            ],
            group: ['triggerWord']
        });

        return stats.map(stat => ({
            trigger: stat.triggerWord,
            active_users: parseInt(stat.get('active_users')),
            total_streaks: parseInt(stat.get('total_streaks')),
            average_streak: parseFloat(stat.get('average_streak'))
        }));
    },

    // New function to get remaining time until next streak
    async getRemainingTime(guildId, userId, word) {
        const limit = await this.getStreakLimit(guildId);
        if (limit === 0) return 0;

        const streak = await Streak.findOne({
            where: {
                guildId,
                userId,
                triggerWord: word.trim().toLowerCase()
            }
        });

        if (!streak) return 0;

        const now = new Date();
        const timeDiff = (now - streak.lastUpdated) / (1000 * 60); // Convert to minutes
        const remainingMinutes = limit - timeDiff;

        if (remainingMinutes <= 0) return 0;

        // Convert to hours and minutes
        const hours = Math.floor(remainingMinutes / 60);
        const minutes = Math.floor(remainingMinutes % 60);
        return { hours, minutes };
    },

    async raidStreak(guildId, attackerId, defenderId, word) {
        // Input validation
        if (!guildId || !attackerId || !defenderId || !word) {
            console.error('Raid attempt failed: Missing parameters', { guildId, attackerId, defenderId, word });
            throw new Error('Missing required parameters for raid');
        }

        if (attackerId === defenderId) {
            console.warn('Raid attempt blocked: Self-raid attempt', { guildId, userId: attackerId });
            throw new Error('Cannot raid yourself');
        }

        if (typeof word !== 'string' || word.trim().length === 0) {
            console.warn('Raid attempt blocked: Invalid trigger word', { guildId, attackerId, word });
            throw new Error('Invalid trigger word');
        }

        let transaction = null;
        let retryCount = 0;
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 1000; // 1 second

        while (retryCount < MAX_RETRIES) {
            try {
                // Start a transaction with SERIALIZABLE isolation level
                transaction = await sequelize.transaction({
                    isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
                });

                // Get raid configuration
                const raidConfig = await this.getRaidConfig(guildId);
                if (!raidConfig.enabled) {
                    console.warn('Raid attempt blocked: Feature disabled', { guildId, attackerId });
                    throw new Error('Raid feature is not enabled in this server');
                }

                // Log raid attempt
                console.log('Raid attempt initiated', {
                    guildId,
                    attackerId,
                    defenderId,
                    word: word.trim().toLowerCase(),
                    timestamp: new Date().toISOString()
                });

                // Validate configuration values
                if (raidConfig.maxStealPercent < 1 || raidConfig.maxStealPercent > 100) {
                    throw new Error('Invalid raid configuration: maxStealPercent must be between 1 and 100');
                }
                if (raidConfig.riskPercent < 1 || raidConfig.riskPercent > 100) {
                    throw new Error('Invalid raid configuration: riskPercent must be between 1 and 100');
                }
                if (raidConfig.successChance < 1 || raidConfig.successChance > 100) {
                    throw new Error('Invalid raid configuration: successChance must be between 1 and 100');
                }
                if (raidConfig.cooldownHours < 1 || raidConfig.cooldownHours > 168) {
                    throw new Error('Invalid raid configuration: cooldownHours must be between 1 and 168');
                }

                // Check cooldown
                if (!await this.canRaid(guildId, attackerId)) {
                    try {
                        const lastRaid = await Streak.findOne({
                            where: {
                                guildId,
                                userId: attackerId
                            },
                            attributes: ['id', 'lastUpdated'], // Only use columns we know exist
                            raw: true
                        });
                        
                        // Since we can't check lastRaidDate, provide a generic message
                        const remainingHours = 1; // Default to 1 hour if we can't calculate
                        throw new Error(`You must wait ${remainingHours} more hour${remainingHours !== 1 ? 's' : ''} before raiding again`);
                    } catch (cooldownError) {
                        throw new Error('You must wait before raiding again');
                    }
                }

                // Anti-exploit: Check for rapid consecutive raids
                // Since we may not have lastRaidDate, use lastUpdated instead
                try {
                    const recentRaids = await Streak.count({
                        where: {
                            guildId,
                            lastUpdated: {
                                [Op.gte]: new Date(Date.now() - 5 * 60 * 1000)
                            }
                        }
                    });
                    if (recentRaids > 10) {
                        console.warn('Raid attempt blocked: Rate limit exceeded', {
                            guildId,
                            attackerId,
                            recentRaids
                        });
                        throw new Error('Too many raids detected. Please wait a few minutes before trying again.');
                    }
                } catch (raidLimitError) {
                    console.warn('Error checking raid limit, continuing anyway', raidLimitError);
                    // Continue even if this check fails
                }

                // Get attacker's streak with lock
                const attackerStreak = await Streak.findOne({
                    where: {
                        guildId,
                        userId: attackerId,
                        triggerWord: word.trim().toLowerCase()
                    },
                    lock: Sequelize.Transaction.LOCK.UPDATE
                });

                if (!attackerStreak) {
                    throw new Error('You need a streak to raid');
                }

                // Get defender's streak with lock
                const defenderStreak = await Streak.findOne({
                    where: {
                        guildId,
                        userId: defenderId,
                        triggerWord: word.trim().toLowerCase()
                    },
                    lock: Sequelize.Transaction.LOCK.UPDATE
                });

                if (!defenderStreak) {
                    throw new Error('Target has no streak to raid');
                }

                // Anti-exploit: Check for suspicious streak patterns
                const defenderRecentUpdates = await Streak.count({
                    where: {
                        guildId,
                        userId: defenderId,
                        lastUpdated: {
                            [Op.gte]: new Date(Date.now() - 60 * 1000)
                        }
                    }
                });
                if (defenderRecentUpdates > 5) {
                    console.warn('Raid attempt blocked: Suspicious defender activity', {
                        guildId,
                        attackerId,
                        defenderId,
                        recentUpdates: defenderRecentUpdates
                    });
                    throw new Error('Target streak is being rapidly updated. Please try again later.');
                }

                // Prevent raiding if attacker has insufficient streaks
                const entryThreshold = 25; // 25% threshold
                const minEntryStreak = 10; // Minimum 10 streaks
                const defenderStreakCount = defenderStreak.count;
                const percentThreshold = Math.floor((entryThreshold / 100) * defenderStreakCount);
                const requiredStreak = Math.max(minEntryStreak, percentThreshold);

                console.log('Raid threshold calculation:', {
                    attackerName: attackerId,
                    attackerStreaks: attackerStreak.count,
                    defenderName: defenderId,
                    defenderStreaks: defenderStreakCount,
                    entryThresholdPercent: entryThreshold,
                    percentCalculation: `${entryThreshold}% of ${defenderStreakCount} = ${percentThreshold}`,
                    minEntryRequired: minEntryStreak,
                    finalRequired: requiredStreak
                });

                if (attackerStreak.count < requiredStreak) {
                    throw new Error(`You need at least ${requiredStreak} streaks to raid. This is the higher of: (1) minimum ${minEntryStreak} streaks, or (2) ${entryThreshold}% of target's ${defenderStreakCount} streaks = ${percentThreshold} streaks.`);
                }

                // Anti-exploit: Maximum streak cap for raids
                const MAX_STREAK_FOR_RAID = 10000;
                if (defenderStreak.count > MAX_STREAK_FOR_RAID) {
                    throw new Error('Target streak is too high to raid');
                }

                // Update the risk amount calculation with min/max limits
                const calculatedRiskPercent = raidConfig.riskPercent || 15;
                
                // Calculate streak ratio to determine if this is an underdog raid
                const streakRatio = attackerStreak.count / defenderStreak.count;
                
                // Dynamic risk adjustment for underdogs
                let riskAdjustment = 1.0; // Default multiplier (no change)
                let stealBonus = 0; // Default (no bonus)
                
                // If attacker has significantly fewer streaks than defender (underdog)
                if (streakRatio < 0.75) {
                    // Scale the risk down based on how much of an underdog they are
                    riskAdjustment = Math.max(0.6, streakRatio); // Min 40% risk reduction (0.6 multiplier)
                    
                    // Bonus to steal amount for underdogs
                    if (streakRatio < 0.5) {
                        stealBonus = 10; // +10% bonus for significant underdogs
                    } else {
                        stealBonus = 5; // +5% bonus for moderate underdogs
                    }
                }
                
                // Apply risk adjustment
                let riskAmount = Math.floor(attackerStreak.count * (calculatedRiskPercent / 100) * riskAdjustment);
                
                // Apply minimum and maximum limits
                riskAmount = Math.max(raidConfig.minRiskAmount || 3, riskAmount);
                riskAmount = Math.min(raidConfig.maxRiskAmount || 20, riskAmount);

                // Update the steal amount calculation with min/max limits
                const maxStealPercent = raidConfig.maxStealPercent || 20;
                
                // Calculate a random percentage between 30-100% of the maxStealPercent
                // Add stealBonus for underdogs
                const stealPercent = Math.min(
                    maxStealPercent + stealBonus,
                    Math.floor(Math.random() * (maxStealPercent * 0.7)) + Math.floor(maxStealPercent * 0.3) + stealBonus
                );
                
                let stealAmount = Math.floor(defenderStreak.count * (stealPercent / 100));
                
                // Apply minimum and maximum limits
                stealAmount = Math.max(raidConfig.minStealAmount || 5, stealAmount);
                stealAmount = Math.min(raidConfig.maxStealAmount || 30, stealAmount);

                // Determine raid success with bonus chances
                const baseSuccessChance = raidConfig.successChance || 50;
                const initiatorBonus = 5; // Additional 5% chance for the raid initiator
                
                // Add progressive bonus based on defender's streak size
                // This creates a balancing mechanism where higher streaks are slightly easier to raid
                let progressiveBonus = 0;
                if (defenderStreak.count >= 100) progressiveBonus = 15; // +15% for streaks 100+
                else if (defenderStreak.count >= 75) progressiveBonus = 12; // +12% for streaks 75-99
                else if (defenderStreak.count >= 50) progressiveBonus = 9; // +9% for streaks 50-74
                else if (defenderStreak.count >= 25) progressiveBonus = 6; // +6% for streaks 25-49
                else if (defenderStreak.count >= 10) progressiveBonus = 3; // +3% for streaks 10-24
                
                // Calculate final success chance with a cap of 95% to avoid guaranteed raids
                const adjustedSuccessChance = Math.min(95, baseSuccessChance + initiatorBonus + progressiveBonus);
                
                // Log the chance calculation and dynamic adjustments
                console.log('Raid dynamics calculation:', {
                    baseSuccessChance,
                    initiatorBonus,
                    progressiveBonus,
                    streakRatio,
                    riskAdjustment,
                    stealBonus,
                    defenderStreakCount: defenderStreak.count,
                    attackerStreakCount: attackerStreak.count,
                    adjustedSuccessChance,
                    stealPercent,
                    stealAmount,
                    riskAmount,
                    adjustedRiskPercent: calculatedRiskPercent * riskAdjustment,
                    timestamp: new Date().toISOString()
                });
                
                // Determine if raid succeeds
                const success = Math.random() * 100 < adjustedSuccessChance;

                if (success) {
                    // Successful raid
                    attackerStreak.count += stealAmount;
                    defenderStreak.count -= stealAmount;
                    if (defenderStreak.count < 1) defenderStreak.count = 1;
                } else {
                    // Failed raid - now give the risk amount to the defender
                    attackerStreak.count -= riskAmount;
                    defenderStreak.count += riskAmount; // Give the risk amount to the defender
                    if (attackerStreak.count < 1) attackerStreak.count = 1;
                }

                // After determining raid success or failure, set the appropriate cooldown
                const cooldownHours = success ? 
                    (raidConfig.successCooldownHours || 4) : 
                    (raidConfig.failureCooldownHours || 2);

                // Store cooldown information in a way that can be retrieved later
                try {
                    // Store the raid time and outcome for cooldown calculation
                    attackerStreak.lastRaidDate = new Date();
                    attackerStreak.lastRaidSuccess = success;
                } catch (dateError) {
                    console.warn('Could not update raid information, columns might not exist:', dateError.message);
                    // Continue even if this fails - it's not critical
                }

                // Save changes
                await attackerStreak.save({ transaction });
                await defenderStreak.save({ transaction });

                // Commit the transaction
                await transaction.commit();

                // Log raid result
                console.log('Raid completed', {
                    guildId,
                    attackerId,
                    defenderId,
                    word: word.trim().toLowerCase(),
                    success,
                    stealAmount,
                    riskAmount,
                    attackerNewCount: attackerStreak.count,
                    defenderNewCount: defenderStreak.count,
                    stealPercent,
                    timestamp: new Date().toISOString()
                });

                return {
                    success,
                    stealAmount,
                    riskAmount,
                    attackerNewCount: attackerStreak.count,
                    defenderNewCount: defenderStreak.count,
                    stealPercent
                };
            } catch (error) {
                // Log the error
                console.error(`Raid attempt ${retryCount + 1} failed:`, {
                    guildId,
                    attackerId,
                    defenderId,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });

                // Rollback the transaction if it exists
                if (transaction) {
                    try {
                        await transaction.rollback();
                    } catch (rollbackError) {
                        console.error('Error rolling back transaction:', rollbackError);
                    }
                }

                // Check if we should retry
                if (retryCount < MAX_RETRIES - 1) {
                    retryCount++;
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount)); // Exponential backoff
                    continue;
                }

                // If we've exhausted all retries, throw the error
                throw new Error(`Failed to complete raid after ${MAX_RETRIES} attempts: ${error.message}`);
            }
        }
    },

    // New function to set streak streak enabled status
    async setStreakStreakEnabled(guildId, enabled) {
        await GuildConfig.upsert({
            guildId,
            streakStreakEnabled: enabled
        });
    },

    // New function to get leaderboard
    async getLeaderboard(guildId, word) {
        try {
            const streaks = await Streak.findAll({
                where: {
                    guildId: guildId,
                    triggerWord: word.trim().toLowerCase()
                },
                order: [['count', 'DESC']],
                limit: 10 // Just get top 10 directly from database
            });

            // Map to array of objects with userId and count
            return streaks.map(streak => ({
                userId: streak.userId,
                count: streak.count
            }));
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            return [];
        }
    },

    // New function to get statistics for a trigger word
    async getStats(guildId, word) {
        const wordStats = await Streak.findAll({
            where: {
                guildId,
                triggerWord: word.trim().toLowerCase()
            },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('userId')), 'users'],
                [sequelize.fn('SUM', sequelize.col('count')), 'total'],
                [sequelize.fn('AVG', sequelize.col('count')), 'average'],
                [sequelize.fn('MAX', sequelize.col('count')), 'max']
            ]
        });

        // Format the result
        if (wordStats && wordStats.length > 0) {
            return {
                users: parseInt(wordStats[0].get('users')) || 0,
                total: parseInt(wordStats[0].get('total')) || 0,
                average: parseFloat(wordStats[0].get('average')) || 0,
                max: parseInt(wordStats[0].get('max')) || 0
            };
        }

        return {
            users: 0,
            total: 0,
            average: 0,
            max: 0
        };
    },

    // New function to reset a specific user's streak for a word
    async resetStreak(guildId, userId, word) {
        await Streak.destroy({
            where: {
                guildId,
                userId,
                triggerWord: word.trim().toLowerCase()
            }
        });
    },

    // New function to add a trigger word (wrapper for setTriggerWords)
    async addTriggerWord(guildId, word) {
        const currentWords = await this.getTriggerWords(guildId);
        if (currentWords.includes(word.trim().toLowerCase())) {
            return; // Word already exists
        }
        return this.setTriggerWords(guildId, [...currentWords, word]);
    },

    // New function to remove a specific trigger word
    async removeTriggerWord(guildId, word) {
        const currentWords = await this.getTriggerWords(guildId);
        const wordToRemove = word.trim().toLowerCase();
        const updatedWords = currentWords.filter(w => w !== wordToRemove);
        return this.setTriggerWords(guildId, updatedWords);
    },

    // New function to get gambling configuration
    async getGamblingConfig(guildId) {
        const config = await GuildConfig.findByPk(guildId);
        return {
            enabled: config ? config.gamblingEnabled : false,
            successChance: config ? config.gamblingSuccessChance : 50,
            maxGamblePercent: config ? config.gamblingMaxPercent : 50,
            minStreaks: config ? config.gamblingMinStreaks : 10
        };
    },

    // New function to update gambling configuration
    async updateGamblingConfig(guildId, config) {
        await GuildConfig.upsert({
            guildId,
            gamblingEnabled: config.enabled,
            gamblingSuccessChance: config.successChance,
            gamblingMaxPercent: config.maxGamblePercent,
            gamblingMinStreaks: config.minStreaks
        });
    },

    // New function to update raid configuration (alias for setRaidConfig)
    async updateRaidConfig(guildId, config) {
        try {
            guildId = String(guildId);
            
            // Update guild config with raid settings
            await GuildConfig.upsert({
                guildId,
                raidEnabled: config.enabled !== undefined ? config.enabled : false,
                raidMaxStealPercent: config.stealPercentage || 20,
                raidRiskPercent: config.riskPercentage || 15,
                raidSuccessChance: config.successChance || 50,
                raidMinStealAmount: config.minStealAmount || 5,
                raidMaxStealAmount: config.maxStealAmount || 30,
                raidMinRiskAmount: config.minRiskAmount || 3,
                raidMaxRiskAmount: config.maxRiskAmount || 20,
                raidSuccessCooldownHours: config.successCooldownHours || 4,
                raidFailureCooldownHours: config.failureCooldownHours || 2
            });
            
            return true;
        } catch (error) {
            console.error('Error in updateRaidConfig:', error);
            return false;
        }
    },

    // Add a new function to get the remaining raid cooldown time
    async getRemainingRaidTime(guildId, userId) {
        try {
            guildId = String(guildId);
            userId = String(userId);
            
            // Get raid config
            const config = await this.getRaidConfig(guildId);
            
            // First check if raid is enabled
            if (!config.enabled) {
                return { 
                    canRaid: false, 
                    message: "The raid system is disabled on this server."
                };
            }
            
            // Find user's raid history
            let userRaidHistory;
            try {
                userRaidHistory = await RaidHistory.findOne({
                    where: { guildId, userId }
                });
            } catch (error) {
                console.error('Error fetching raid history, falling back to defaults:', error);
                // If RaidHistory table doesn't exist yet, allow raiding
                return { canRaid: true };
            }
            
            // If no raid history or never raided, they can raid
            if (!userRaidHistory || !userRaidHistory.lastRaidDate) {
                return { canRaid: true };
            }
            
            // Get last raid date
            const lastRaidDate = new Date(userRaidHistory.lastRaidDate);
            const now = new Date();
            
            // Get appropriate cooldown based on last raid success
            const cooldownHours = userRaidHistory.lastRaidSuccess ? 
                (config.successCooldownHours || 4) : 
                (config.failureCooldownHours || 2);
            
            // Calculate when cooldown expires
            const cooldownExpiry = new Date(lastRaidDate);
            cooldownExpiry.setHours(cooldownExpiry.getHours() + cooldownHours);
            
            // Check if cooldown has expired
            if (now >= cooldownExpiry) {
                return { canRaid: true };
            }
            
            // Calculate remaining time in seconds
            const remainingTime = Math.floor((cooldownExpiry - now) / 1000);
            
            // Calculate hours and minutes for display
            const remainingHours = Math.floor(remainingTime / 3600);
            const remainingMinutes = Math.floor((remainingTime % 3600) / 60);
            
            // Format the remaining time for Discord timestamp
            const remainingTimeFormatted = `<t:${Math.floor(cooldownExpiry.getTime() / 1000)}:R>`;
            
            return {
                canRaid: false,
                message: `You're on raid cooldown. You can raid again ${remainingTimeFormatted}.`,
                remainingTime,
                remainingTimeFormatted,
                remainingHours,
                remainingMinutes,
                cooldownExpiry,
                wasSuccessful: userRaidHistory.lastRaidSuccess
            };
        } catch (error) {
            console.error('Error in getRemainingRaidTime:', error);
            // Return a safe default - assume they can raid if there's an error
            return { canRaid: true };
        }
    },

    async raidUserStreak(guildId, attackerId, defenderId, word) {
        try {
            // Validate parameters
            guildId = String(guildId);
            attackerId = String(attackerId);
            defenderId = String(defenderId);
            word = String(word || '').trim().toLowerCase();
            
            if (!word) {
                return { success: false, message: 'Invalid trigger word.' };
            }
            
            // Get raid configuration
            const config = await this.getRaidConfig(guildId);
            if (!config || !config.enabled) {
                return { success: false, message: 'Raiding is not enabled on this server.' };
            }
            
            // Check if raider has an active raid cooldown
            const cooldownInfo = await this.getRemainingRaidTime(guildId, attackerId);
            if (!cooldownInfo.canRaid) {
                return { success: false, message: cooldownInfo.message };
            }
            
            // Prevent raiding yourself
            if (attackerId === defenderId) {
                return { success: false, message: 'You cannot raid yourself.' };
            }
            
            // Find attacker streak
            const attackerStreak = await Streak.findOne({
                where: {
                    guildId,
                    userId: attackerId,
                    triggerWord: word
                }
            });
            
            if (!attackerStreak) {
                return { success: false, message: `You don't have a streak for '${word}' to raid with.` };
            }
            
            if (attackerStreak.count < 1) {
                return { success: false, message: `You need a positive streak to raid. Your current streak is ${attackerStreak.count}.` };
            }
            
            // Find defender streak
            const defenderStreak = await Streak.findOne({
                where: {
                    guildId,
                    userId: defenderId,
                    triggerWord: word
                }
            });
            
            if (!defenderStreak) {
                return { success: false, message: `Target user doesn't have a streak for '${word}'.` };
            }
            
            if (defenderStreak.count < 1) {
                return { success: false, message: `Target user has no streaks for '${word}' to raid.` };
            }
            
            // Start a transaction to ensure consistency
            const transaction = await sequelize.transaction();
            
            try {
                // Get raid entry threshold
                const entryThreshold = config.entryThreshold || 25; // Default: 25% of defender's streak
                const minEntryStreak = config.minEntryStreak || 10; // Default: at least 10 streaks needed
                
                // Calculate minimum streak needed to raid this defender
                const defenderStreakCount = defenderStreak.count;
                const percentThreshold = Math.floor((entryThreshold / 100) * defenderStreakCount);
                const requiredStreak = Math.max(minEntryStreak, percentThreshold);

                // Add detailed logging to debug the issue
                console.log('Raid threshold calculation:', {
                    attackerName: attackerId,
                    attackerStreaks: attackerStreak.count,
                    defenderName: defenderId,
                    defenderStreaks: defenderStreakCount,
                    entryThresholdPercent: entryThreshold,
                    percentCalculation: `${entryThreshold}% of ${defenderStreakCount} = ${percentThreshold}`,
                    minEntryRequired: minEntryStreak,
                    finalRequired: requiredStreak
                });

                if (attackerStreak.count < requiredStreak) {
                    await transaction.rollback();
                    // Improved error message that's clearer about the calculation
                    return { 
                        success: false, 
                        message: `You need at least ${requiredStreak} streaks to raid. This is the higher of: (1) minimum ${minEntryStreak} streaks, or (2) ${entryThreshold}% of target's ${defenderStreakCount} streaks = ${percentThreshold} streaks.` 
                    };
                }
                
                // Determine steal amount (percentage of defender's streaks)
                const stealPercentage = config.stealPercentage || 20; // Default: 20%
                const minStealAmount = config.minStealAmount || 5; // Default: minimum 5 streaks
                const maxStealAmount = config.maxStealAmount || 30; // Default: maximum 30 streaks
                
                // Calculate base steal amount
                let stealAmount = Math.round((stealPercentage / 100) * defenderStreak.count);
                
                // Apply min/max limits
                stealAmount = Math.min(maxStealAmount, Math.max(minStealAmount, stealAmount));
                
                // Ensure we don't steal more than the defender has
                stealAmount = Math.min(stealAmount, defenderStreak.count - 1);
                
                // Determine risk amount (percentage of attacker's streaks)
                const riskPercentage = config.riskPercentage || 15; // Default: 15% 
                const minRiskAmount = config.minRiskAmount || 3; // Default: minimum 3 streaks
                const maxRiskAmount = config.maxRiskAmount || 20; // Default: maximum 20 streaks
                
                // Calculate base risk amount
                let riskAmount = Math.round((riskPercentage / 100) * attackerStreak.count);
                
                // Apply min/max limits
                riskAmount = Math.min(maxRiskAmount, Math.max(minRiskAmount, riskAmount));
                
                // Ensure we don't risk more than the attacker has
                riskAmount = Math.min(riskAmount, attackerStreak.count - 1);
                
                // Get raid success chance (default 50%)
                const successChance = config.successChance !== undefined ? config.successChance : 50;
                
                // Determine raid success
                const random = Math.random() * 100;
                const isSuccess = random <= successChance;
                
                // Get cooldown hours from config
                const cooldownHours = isSuccess ? 
                    (config.successCooldownHours || 4) : // Default: 4 hours
                    (config.failureCooldownHours || 2);  // Default: 2 hours
                
                let resultMessage = '';
                let attackerNewStreak = attackerStreak.count;
                let defenderNewStreak = defenderStreak.count;
                
                if (isSuccess) {
                    // Attacker succeeded - takes streaks from defender
                    attackerNewStreak += stealAmount;
                    defenderNewStreak -= stealAmount;
                    
                    // Update both streaks
                    await attackerStreak.update({ count: attackerNewStreak }, { transaction });
                    await defenderStreak.update({ count: Math.max(1, defenderNewStreak) }, { transaction });
                    
                    resultMessage = `Raid successful! You stole ${stealAmount} streaks from <@${defenderId}>. Your streak is now ${attackerNewStreak}.`;
                } else {
                    // Attacker failed - loses streaks to defender
                    attackerNewStreak -= riskAmount;
                    defenderNewStreak += riskAmount;
                    
                    // Update both streaks
                    await attackerStreak.update({ count: Math.max(1, attackerNewStreak) }, { transaction });
                    await defenderStreak.update({ count: defenderNewStreak }, { transaction });
                    
                    resultMessage = `Raid failed! You lost ${riskAmount} streaks to <@${defenderId}>. Your streak is now ${Math.max(1, attackerNewStreak)}.`;
                }
                
                // Store raid attempt in user's raid history
                try {
                    await this.updateRaidHistory(guildId, attackerId, {
                        lastRaidDate: new Date(),
                        lastRaidSuccess: isSuccess
                    });
                } catch (historyError) {
                    console.error('Failed to update raid history, continuing anyway:', historyError);
                    // Don't fail the raid due to history update issue
                }
                
                await transaction.commit();
                
                // Format next raid time
                const nextRaidDate = new Date();
                nextRaidDate.setHours(nextRaidDate.getHours() + cooldownHours);
                const nextRaidTimeFormatted = `<t:${Math.floor(nextRaidDate.getTime() / 1000)}:R>`;
                
                return {
                    success: true,
                    raidSuccess: isSuccess,
                    message: resultMessage,
                    cooldownMessage: `You can raid again ${nextRaidTimeFormatted}.`,
                    cooldownHours,
                    attackerId,
                    defenderId,
                    word,
                    attackerOldStreak: attackerStreak.count,
                    attackerNewStreak: Math.max(1, attackerNewStreak),
                    defenderOldStreak: defenderStreak.count,
                    defenderNewStreak: Math.max(1, defenderNewStreak),
                    stealAmount,
                    riskAmount,
                    entryThreshold,
                    minEntryStreak,
                    successChance,
                    successRoll: random,
                    nextRaidTime: nextRaidDate
                };
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        } catch (error) {
            console.error('Error in raidUserStreak:', error);
            return { success: false, message: `An error occurred while raiding: ${error.message}` };
        }
    },

    async updateRaidHistory(guildId, userId, historyUpdate) {
        try {
            guildId = String(guildId);
            userId = String(userId);
            
            // Make sure RaidHistory exists
            try {
                // Find or create user's raid history
                let userRaidHistory = await RaidHistory.findOne({
                    where: { guildId, userId }
                });
                
                if (!userRaidHistory) {
                    userRaidHistory = await RaidHistory.create({
                        guildId,
                        userId,
                        lastRaidDate: historyUpdate.lastRaidDate || null,
                        lastRaidSuccess: historyUpdate.lastRaidSuccess || false,
                        totalRaids: 0,
                        successfulRaids: 0
                    });
                }
                
                // Update raid statistics
                const updateData = {
                    lastRaidDate: historyUpdate.lastRaidDate || userRaidHistory.lastRaidDate,
                    lastRaidSuccess: historyUpdate.lastRaidSuccess !== undefined ? 
                        historyUpdate.lastRaidSuccess : userRaidHistory.lastRaidSuccess,
                    totalRaids: userRaidHistory.totalRaids + 1
                };
                
                if (historyUpdate.lastRaidSuccess) {
                    updateData.successfulRaids = userRaidHistory.successfulRaids + 1;
                }
                
                // Save the updated history
                await userRaidHistory.update(updateData);
                
                console.log(`Updated raid history for user ${userId} in guild ${guildId}`);
                return true;
            } catch (historyError) {
                // If RaidHistory table doesn't exist yet, try to fallback to Streak
                console.error('Error updating raid history, attempting fallback:', historyError);
                
                try {
                    // Try to update the streak record instead
                    const streak = await Streak.findOne({
                        where: { guildId, userId }
                    });
                    
                    if (streak) {
                        await streak.update({
                            lastRaidDate: historyUpdate.lastRaidDate || null,
                            lastRaidSuccess: historyUpdate.lastRaidSuccess || false
                        });
                        console.log(`Used fallback to update raid info in streak for user ${userId}`);
                        return true;
                    }
                } catch (fallbackError) {
                    console.error('Fallback update also failed:', fallbackError);
                }
                
                // Both attempts failed, but don't break the application
                console.warn(`Could not update raid history for user ${userId}, but continuing`);
                return false;
            }
        } catch (error) {
            console.error('Error in updateRaidHistory:', error);
            return false;
        }
    },

    // Function to migrate raid data from old format (in Streaks) to new format (in RaidHistory)
    async migrateRaidData(guildId) {
        try {
            guildId = String(guildId);
            console.log(`Starting raid data migration for guild ${guildId}...`);
            
            // Make sure RaidHistory table exists
            const tableExists = await this.ensureRaidHistoryTable();
            if (!tableExists) {
                console.error('Could not ensure RaidHistory table exists, aborting migration');
                return 0;
            }
            
            // Find all streaks with raid data
            const streaksWithRaidData = await Streak.findAll({
                where: {
                    guildId,
                    lastRaidDate: {
                        [Op.not]: null
                    }
                }
            });
            
            console.log(`Found ${streaksWithRaidData.length} streaks with raid data to migrate`);
            
            // Migrate each streak's raid data to RaidHistory
            let migratedCount = 0;
            for (const streak of streaksWithRaidData) {
                // Check if we already have a RaidHistory entry
                let raidHistory = await RaidHistory.findOne({
                    where: {
                        guildId,
                        userId: streak.userId
                    }
                });
                
                // If no history or the streak has more recent raid data, update it
                const shouldUpdate = !raidHistory || 
                    !raidHistory.lastRaidDate || 
                    (streak.lastRaidDate && new Date(streak.lastRaidDate) > new Date(raidHistory.lastRaidDate));
                
                if (shouldUpdate) {
                    if (!raidHistory) {
                        // Create new history
                        raidHistory = await RaidHistory.create({
                            guildId,
                            userId: streak.userId,
                            lastRaidDate: streak.lastRaidDate,
                            lastRaidSuccess: streak.lastRaidSuccess || false,
                            totalRaids: 1,
                            successfulRaids: streak.lastRaidSuccess ? 1 : 0
                        });
                    } else {
                        // Update existing history
                        await raidHistory.update({
                            lastRaidDate: streak.lastRaidDate,
                            lastRaidSuccess: streak.lastRaidSuccess || false,
                            totalRaids: raidHistory.totalRaids + 1,
                            successfulRaids: streak.lastRaidSuccess ? 
                                raidHistory.successfulRaids + 1 : raidHistory.successfulRaids
                        });
                    }
                    migratedCount++;
                }
            }
            
            console.log(`Successfully migrated ${migratedCount} raid records for guild ${guildId}`);
            return migratedCount;
            
        } catch (error) {
            console.error(`Error migrating raid data for guild ${guildId}:`, error);
            return 0;
        }
    },

    // Helper function to ensure RaidHistory table exists
    async ensureRaidHistoryTable() {
        try {
            // Try to sync RaidHistory model directly
            await RaidHistory.sync({ alter: false });
            console.log('RaidHistory table created or already exists');
            return true;
        } catch (error) {
            console.error('Error ensuring RaidHistory table exists:', error);
            return false;
        }
    }
};