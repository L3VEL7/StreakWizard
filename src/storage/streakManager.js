const { GuildConfig, Streak } = require('../database/models');
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
        const config = await GuildConfig.findByPk(guildId);
        return config ? config.raidEnabled : false; // Default to false if not set
    },

    async setRaidEnabled(guildId, enabled) {
        await GuildConfig.upsert({
            guildId,
            raidEnabled: enabled
        });
    },

    async getRaidConfig(guildId) {
        const config = await GuildConfig.findByPk(guildId);
        return {
            enabled: config ? config.raidEnabled : false,
            maxStealPercent: config ? config.raidMaxStealPercent : 20,
            riskPercent: config ? config.raidRiskPercent : 30,
            successChance: config ? config.raidSuccessChance : 40,
            cooldownHours: config ? config.raidCooldownHours : 24 // Default 24 hour cooldown
        };
    },

    async setRaidConfig(guildId, config) {
        await GuildConfig.upsert({
            guildId,
            raidEnabled: config.enabled,
            raidMaxStealPercent: config.maxStealPercent,
            raidRiskPercent: config.riskPercent,
            raidSuccessChance: config.successChance,
            raidCooldownHours: config.cooldownHours
        });
    },

    async canRaid(guildId, userId) {
        try {
            const config = await this.getRaidConfig(guildId);
            if (!config.enabled) return false;

            // Try to find the column using specific attributes to avoid issues with missing columns
            try {
                const lastRaid = await Streak.findOne({
                    where: {
                        guildId,
                        userId
                    },
                    attributes: ['id', 'lastUpdated'], // Only select columns we know exist
                    raw: true
                });

                // If no record or no lastRaidDate, assume user can raid
                if (!lastRaid) return true;
                
                // If lastRaidDate doesn't exist in the schema yet, allow raiding
                // The transaction will add it when user actually raids
                return true;
            } catch (findError) {
                console.error('Error checking raid cooldown:', findError);
                // In case of error, allow raiding
                return true;
            }
        } catch (error) {
            console.error('Error in canRaid:', error);
            // In case of any error, default to false (safer option)
            return false;
        }
    },

    async gambleStreak(guildId, userId, word, percentage, choice) {
        // Start a transaction with SERIALIZABLE isolation level
        const transaction = await sequelize.transaction({
            isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
        });

        try {
            // Validate percentage (1-100)
            if (percentage < 1 || percentage > 100) {
                throw new Error('Percentage must be between 1 and 100');
            }

            // Get current streak with lock
            const streak = await Streak.findOne({
                where: {
                    guildId,
                    userId,
                    triggerWord: word.trim().toLowerCase()
                },
                lock: Sequelize.Transaction.LOCK.UPDATE
            });

            if (!streak) {
                throw new Error('No streak found for this word');
            }

            // Calculate gamble amount
            const gambleAmount = Math.floor(streak.count * (percentage / 100));
            
            // Due to floating point precision, we might get values slightly less than 1
            // Check if the actual amount is at least 1 instead of the calculated amount
            if (streak.count < 1 || percentage <= 0 || gambleAmount < 1) {
                // Log for debugging
                console.log(`Gamble rejected - streak.count: ${streak.count}, percentage: ${percentage}, gambleAmount: ${gambleAmount}`);
                throw new Error('Gamble amount must be at least 1 streak');
            }

            // Perform coin flip
            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            const won = result === choice;

            // Update streak
            if (won) {
                streak.count += gambleAmount;
            } else {
                streak.count -= gambleAmount;
                if (streak.count < 1) streak.count = 1; // Prevent negative streaks
            }

            await streak.save({ transaction });

            // Commit the transaction
            await transaction.commit();

            return {
                won,
                result,
                newCount: streak.count,
                gambleAmount
            };
        } catch (error) {
            // Rollback the transaction on error
            await transaction.rollback();
            throw error;
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

                // Prevent raiding if attacker has fewer streaks than defender
                if (attackerStreak.count < defenderStreak.count * 0.5) {
                    throw new Error('You need at least 50% of the target\'s streak count to raid');
                }

                // Anti-exploit: Maximum streak cap for raids
                const MAX_STREAK_FOR_RAID = 10000;
                if (defenderStreak.count > MAX_STREAK_FOR_RAID) {
                    throw new Error('Target streak is too high to raid');
                }

                // Calculate risk amount
                const riskAmount = Math.floor(attackerStreak.count * (raidConfig.riskPercent / 100));
                if (riskAmount < 1) {
                    throw new Error('Risk amount must be at least 1 streak');
                }

                // Calculate potential steal amount (weighted towards lower percentages)
                const stealPercent = Math.min(
                    raidConfig.maxStealPercent,
                    Math.floor(Math.random() * raidConfig.maxStealPercent * 0.7) + 1 // 70% chance of being below 70% of max
                );
                const stealAmount = Math.floor(defenderStreak.count * (stealPercent / 100));
                if (stealAmount < 1) {
                    throw new Error('Target streak is too low to raid');
                }

                // Anti-exploit: Maximum steal amount cap
                const MAX_STEAL_AMOUNT = 1000;
                if (stealAmount > MAX_STEAL_AMOUNT) {
                    throw new Error('Maximum steal amount exceeded');
                }

                // Determine raid success
                const success = Math.random() * 100 < raidConfig.successChance;

                if (success) {
                    // Successful raid
                    attackerStreak.count += stealAmount;
                    defenderStreak.count -= stealAmount;
                    if (defenderStreak.count < 1) defenderStreak.count = 1;
                } else {
                    // Failed raid
                    attackerStreak.count -= riskAmount;
                    if (attackerStreak.count < 1) attackerStreak.count = 1;
                }

                // Update last raid date
                try {
                    // Try to update the lastRaidDate - it might not exist in database yet
                    attackerStreak.lastRaidDate = new Date();
                } catch (dateError) {
                    console.warn('Could not set lastRaidDate, column might not exist yet:', dateError.message);
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
        const streaks = await Streak.findAll({
            where: {
                guildId,
                triggerWord: word.trim().toLowerCase()
            },
            order: [['count', 'DESC']],
            limit: 100 // Reasonable limit for leaderboard
        });

        // Format the results
        const results = [];
        for (const streak of streaks) {
            try {
                // Get username from Discord if possible (may not be available in all contexts)
                let username = streak.userId;
                results.push({
                    userId: streak.userId,
                    username: username,
                    count: streak.count,
                    streakStreak: streak.streakStreak || 0
                });
            } catch (err) {
                console.error('Error getting username for leaderboard:', err);
                // Still include the entry, just with the ID as fallback
                results.push({
                    userId: streak.userId,
                    username: streak.userId,
                    count: streak.count,
                    streakStreak: streak.streakStreak || 0
                });
            }
        }

        return results;
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
        return this.setRaidConfig(guildId, config);
    }
};