const { GuildConfig, Streak } = require('../database/models');
const { Op } = require('sequelize');
const sequelize = require('sequelize');

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

    async incrementStreak(guildId, userId, word) {
        const processedWord = word.trim().toLowerCase();

        if (!await this.canUpdateStreak(guildId, userId, processedWord)) {
            return -1;
        }

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

        if (!created) {
            const oldCount = streak.count;
            const today = new Date().toISOString().split('T')[0];
            
            // Update streak streak only if enabled
            if (await this.isStreakStreakEnabled(guildId)) {
                if (streak.lastStreakDate) {
                    const lastDate = new Date(streak.lastStreakDate);
                    const currentDate = new Date(today);
                    const daysDiff = Math.floor((currentDate - lastDate) / (1000 * 60 * 60 * 24));
                    
                    if (daysDiff === 1) {
                        // Consecutive day
                        streak.streakStreak += 1;
                    } else if (daysDiff > 1) {
                        // Streak broken
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

            // Check for milestone achievement
            const milestone = MILESTONES.find(m => m.level === streak.count);
            if (milestone) {
                return {
                    count: streak.count,
                    streakStreak: streak.streakStreak,
                    milestone: {
                        level: milestone.level,
                        emoji: milestone.emoji
                    }
                };
            }

            // Check for streak streak milestone only if enabled
            if (await this.isStreakStreakEnabled(guildId)) {
                const streakStreakMilestone = STREAK_STREAK_MILESTONES.find(m => m.level === streak.streakStreak);
                if (streakStreakMilestone) {
                    return {
                        count: streak.count,
                        streakStreak: streak.streakStreak,
                        streakStreakMilestone: {
                            level: streakStreakMilestone.level,
                            emoji: streakStreakMilestone.emoji
                        }
                    };
                }
            }
        }

        return { 
            count: streak.count,
            streakStreak: streak.streakStreak
        };
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
    }
};