/**
 * Stats Module
 * 
 * Provides functions for retrieving streak statistics:
 * - Getting stats for all streaks or filtered by trigger word
 * - Getting leaderboard data
 */
const { Streak } = require('../../database/models');
const { Sequelize, Op } = require('sequelize');
const sequelize = require('../../database/config');

/**
 * Get statistics for streaks in a guild
 * 
 * @param {string} guildId - Guild ID
 * @param {string} word - Optional trigger word filter
 * @returns {Object} - Stats object with total counts and averages
 */
async function getStats(guildId, word = null) {
    try {
        // Build the where clause
        const whereClause = { guildId };
        
        if (word) {
            whereClause.triggerWord = word.toLowerCase();
        }
        
        // Get all matching streaks
        const streaks = await Streak.findAll({
            where: whereClause,
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalStreaks'],
                [sequelize.fn('SUM', sequelize.col('count')), 'totalCount'],
                [sequelize.fn('AVG', sequelize.col('count')), 'averageCount'],
                [sequelize.fn('MAX', sequelize.col('count')), 'maxCount'],
                [sequelize.fn('MAX', sequelize.col('bestStreak')), 'maxBestStreak'],
                [sequelize.fn('COUNT', sequelize.literal('DISTINCT "userId"')), 'uniqueUsers']
            ],
            raw: true
        });
        
        // If no streaks found, return empty stats
        if (!streaks || !streaks[0] || !streaks[0].totalStreaks) {
            return {
                totalStreaks: 0,
                totalCount: 0,
                averageCount: 0,
                maxCount: 0,
                maxBestStreak: 0,
                uniqueUsers: 0,
                word: word || 'all'
            };
        }
        
        // Calculate stats
        const stats = {
            totalStreaks: parseInt(streaks[0].totalStreaks) || 0,
            totalCount: parseInt(streaks[0].totalCount) || 0,
            averageCount: Math.round(parseFloat(streaks[0].averageCount) * 10) / 10 || 0,
            maxCount: parseInt(streaks[0].maxCount) || 0,
            maxBestStreak: parseInt(streaks[0].maxBestStreak) || 0,
            uniqueUsers: parseInt(streaks[0].uniqueUsers) || 0,
            word: word || 'all'
        };
        
        return stats;
    } catch (error) {
        console.error('Error getting stats:', error);
        // Return empty stats on error
        return {
            totalStreaks: 0,
            totalCount: 0,
            averageCount: 0,
            maxCount: 0,
            maxBestStreak: 0,
            uniqueUsers: 0,
            word: word || 'all',
            error: error.message
        };
    }
}

/**
 * Get leaderboard data for a guild
 * 
 * @param {string} guildId - Guild ID
 * @param {string} word - Optional trigger word filter
 * @param {number} limit - Max number of entries to return (default 10)
 * @returns {Array} - Array of leaderboard entries
 */
async function getLeaderboard(guildId, word = null, limit = 10) {
    try {
        // Build the where clause
        const whereClause = { guildId };
        
        if (word) {
            whereClause.triggerWord = word.toLowerCase();
        }
        
        // Get all matching streaks, ordered by count
        const streaks = await Streak.findAll({
            where: whereClause,
            attributes: [
                'userId',
                'triggerWord',
                'count',
                'bestStreak',
                'streakStreak'
            ],
            order: [['count', 'DESC']],
            limit: limit,
            raw: true
        });
        
        // Transform data for display
        const leaderboard = streaks.map((streak, index) => ({
            position: index + 1,
            userId: streak.userId,
            triggerWord: streak.triggerWord,
            count: streak.count,
            bestStreak: streak.bestStreak,
            streakStreak: streak.streakStreak
        }));
        
        return leaderboard;
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        return [];
    }
}

module.exports = {
    getStats,
    getLeaderboard
}; 