const { GuildConfig, Streak } = require('../database/models');
const { Op } = require('sequelize');

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
                lastUpdated: new Date()
            }
        });

        if (!created) {
            streak.count += 1;
            streak.lastUpdated = new Date();
            await streak.save();
        }

        return streak.count;
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
    }
};