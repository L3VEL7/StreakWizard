const { GuildConfig, Streak } = require('../database/models');
const { Op } = require('sequelize');
const { sequelize } = require('../database/models');

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

    async getTriggerWords(guildId) {
        try {
            const config = await GuildConfig.findByPk(guildId);
            console.log(`Retrieved config for guild ${guildId}:`, config?.toJSON());

            if (!config) {
                console.log(`No config found for guild ${guildId}`);
                return [];
            }

            // Ensure triggerWords is always an array
            const words = Array.isArray(config.triggerWords) ? config.triggerWords : [];
            console.log(`Processed trigger words for guild ${guildId}:`, words);
            return words;
        } catch (error) {
            console.error(`Error getting trigger words for guild ${guildId}:`, error);
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
        const config = await this.getRaidConfig(guildId);
        if (!config.enabled) return false;

        const lastRaid = await Streak.findOne({
            where: {
                guildId,
                userId,
                lastRaidDate: {
                    [Op.not]: null
                }
            }
        });

        if (!lastRaid) return true;

        const now = new Date();
        const hoursSinceLastRaid = (now - lastRaid.lastRaidDate) / (1000 * 60 * 60);
        return hoursSinceLastRaid >= config.cooldownHours;
    },

    async gambleStreak(guildId, userId, word, percentage, choice) {
        // Start a transaction with SERIALIZABLE isolation level
        const transaction = await sequelize.transaction({
            isolationLevel: sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
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
                lock: transaction.LOCK.UPDATE
            });

            if (!streak) {
                throw new Error('No streak found for this word');
            }

            // Calculate gamble amount
            const gambleAmount = Math.floor(streak.count * (percentage / 100));
            if (gambleAmount < 1) {
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

    // New function to get user's streaks
    async getUserStreaks(guildId, userId) {
        const streaks = await Streak.findAll({
            where: {
                guildId,
                userId
            },
            order: [['count', 'DESC']]
        });

        return streaks.map(streak => ({
            trigger: streak.triggerWord,
            count: streak.count,
            best_streak: streak.bestStreak || streak.count,
            lastUpdated: streak.lastUpdated
        }));
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
        // Start a transaction with SERIALIZABLE isolation level
        const transaction = await sequelize.transaction({
            isolationLevel: sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE
        });

        try {
            // Get raid configuration
            const raidConfig = await this.getRaidConfig(guildId);
            if (!raidConfig.enabled) {
                throw new Error('Raid feature is not enabled in this server');
            }

            // Check cooldown
            if (!await this.canRaid(guildId, attackerId)) {
                const lastRaid = await Streak.findOne({
                    where: {
                        guildId,
                        userId: attackerId,
                        lastRaidDate: {
                            [Op.not]: null
                        }
                    }
                });
                const now = new Date();
                const hoursSinceLastRaid = (now - lastRaid.lastRaidDate) / (1000 * 60 * 60);
                const remainingHours = Math.ceil(raidConfig.cooldownHours - hoursSinceLastRaid);
                throw new Error(`You must wait ${remainingHours} more hour${remainingHours !== 1 ? 's' : ''} before raiding again`);
            }

            // Anti-exploit: Check for rapid consecutive raids
            const recentRaids = await Streak.count({
                where: {
                    guildId,
                    lastRaidDate: {
                        [Op.gte]: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
                    }
                }
            });
            if (recentRaids > 10) { // More than 10 raids in 5 minutes
                throw new Error('Too many raids detected. Please wait a few minutes before trying again.');
            }

            // Get attacker's streak with lock
            const attackerStreak = await Streak.findOne({
                where: {
                    guildId,
                    userId: attackerId,
                    triggerWord: word.trim().toLowerCase()
                },
                lock: transaction.LOCK.UPDATE
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
                lock: transaction.LOCK.UPDATE
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
                        [Op.gte]: new Date(Date.now() - 60 * 1000) // Last minute
                    }
                }
            });
            if (defenderRecentUpdates > 5) { // More than 5 streak updates in a minute
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
            attackerStreak.lastRaidDate = new Date();

            // Save changes
            await attackerStreak.save({ transaction });
            await defenderStreak.save({ transaction });

            // Commit the transaction
            await transaction.commit();

            return {
                success,
                stealAmount,
                riskAmount,
                attackerNewCount: attackerStreak.count,
                defenderNewCount: defenderStreak.count,
                stealPercent
            };
        } catch (error) {
            // Rollback the transaction on error
            await transaction.rollback();
            throw error;
        }
    }
};