/**
 * Gambling System Module
 * 
 * Provides functions for the streak gambling system:
 * - Checking if gambling is enabled
 * - Getting and updating gambling config
 * - Executing streak gambling
 */
const { GuildConfig, Streak } = require('../../database/models');
const sequelize = require('../../database/config');

/**
 * Check if gambling is enabled for a guild
 */
async function isGamblingEnabled(guildId) {
    try {
        const config = await GuildConfig.findByPk(guildId);
        return config ? !!config.gamblingEnabled : false;
    } catch (error) {
        console.error('Error checking if gambling is enabled:', error);
        return false;
    }
}

/**
 * Get gambling configuration for a guild
 */
async function getGamblingConfig(guildId) {
    try {
        const config = await GuildConfig.findByPk(guildId);
        if (!config) {
            // Return default values if no config exists
            return {
                enabled: false,
                successChance: 50,
                maxGamblePercent: 50,
                minStreaks: 10
            };
        }
        
        return {
            enabled: config.gamblingEnabled || false,
            successChance: config.gamblingSuccessChance || 50,
            maxGamblePercent: config.gamblingMaxPercent || 50,
            minStreaks: config.gamblingMinStreaks || 10
        };
    } catch (error) {
        console.error('Error getting gambling config:', error);
        // Return default values in case of error
        return {
            enabled: false,
            successChance: 50,
            maxGamblePercent: 50,
            minStreaks: 10
        };
    }
}

/**
 * Update gambling configuration for a guild
 */
async function updateGamblingConfig(guildId, config) {
    try {
        await GuildConfig.upsert({
            guildId: guildId,
            gamblingEnabled: config.enabled,
            gamblingSuccessChance: config.successChance,
            gamblingMaxPercent: config.maxGamblePercent,
            gamblingMinStreaks: config.minStreaks
        });
        return true;
    } catch (error) {
        console.error('Error updating gambling config:', error);
        throw error;
    }
}

/**
 * Get user streaks for gambling
 * Returns the streaks in a format suitable for the gambling command
 */
async function getUserStreaksForGambling(guildId, userId) {
    try {
        const streaks = await Streak.findAll({
            where: { guildId, userId }
        });
        
        // Transform to a simpler format for the gambling system
        return streaks.map(streak => ({
            id: streak.id,
            trigger: streak.triggerWord,
            count: streak.count,
            streakStreak: streak.streakStreak
        }));
    } catch (error) {
        console.error('Error getting user streaks for gambling:', error);
        return [];
    }
}

/**
 * Gamble a certain percentage of a user's streak
 * 
 * @param {string} guildId - The guild ID
 * @param {string} userId - The user ID
 * @param {string} triggerWord - The trigger word to gamble
 * @param {number} percentage - Percentage of current streak to gamble
 * @param {string} choice - The gambling choice (only 'double' supported for now)
 * @returns {Object} - Result of the gambling attempt
 */
async function gambleStreak(guildId, userId, triggerWord, percentage, choice) {
    // Start a transaction
    const transaction = await sequelize.transaction();
    
    try {
        // Get the gambling configuration
        const gamblingConfig = await getGamblingConfig(guildId);
        
        // Check if gambling is enabled
        if (!gamblingConfig.enabled) {
            await transaction.rollback();
            return { 
                success: false, 
                message: 'Gambling is currently disabled in this server.' 
            };
        }
        
        // Check if the percentage is valid
        if (percentage <= 0 || percentage > gamblingConfig.maxGamblePercent) {
            await transaction.rollback();
            return { 
                success: false, 
                message: `Gambling percentage must be between 1% and ${gamblingConfig.maxGamblePercent}%.` 
            };
        }
        
        // Get the streak
        const streak = await Streak.findOne({
            where: { guildId, userId, triggerWord }
        }, { transaction });
        
        if (!streak) {
            await transaction.rollback();
            return { 
                success: false, 
                message: `You don't have any streaks for "${triggerWord}".` 
            };
        }
        
        // Check minimum streak requirement
        if (streak.count < gamblingConfig.minStreaks) {
            await transaction.rollback();
            return { 
                success: false, 
                message: `You need at least ${gamblingConfig.minStreaks} streaks to gamble.` 
            };
        }
        
        // Calculate amount to gamble
        const gambleAmount = Math.max(1, Math.floor((percentage / 100) * streak.count));
        
        // Don't allow gambling all streaks
        if (gambleAmount >= streak.count) {
            await transaction.rollback();
            return { 
                success: false, 
                message: 'You cannot gamble your entire streak. Keep at least 1 streak.' 
            };
        }
        
        // Store original streak count for reporting
        const oldStreak = streak.count;
        
        // Determine success chance and roll for result
        const successChance = gamblingConfig.successChance || 50;
        const roll = Math.random() * 100;
        const isSuccess = roll <= successChance;
        
        let newStreak = oldStreak;
        
        if (isSuccess) {
            // User won - add the gamble amount
            newStreak += gambleAmount;
        } else {
            // User lost - subtract the gamble amount
            newStreak -= gambleAmount;
        }
        
        // Update streak in database
        await streak.update({
            count: newStreak
        }, { transaction });
        
        // Commit transaction
        await transaction.commit();
        
        // Return detailed result
        return {
            success: true,
            result: isSuccess,
            oldStreak,
            newStreak,
            difference: newStreak - oldStreak,
            gambleAmount,
            percentageUsed: percentage,
            roll,
            successChance,
            message: isSuccess ? 
                `You won ${gambleAmount} streaks!` : 
                `You lost ${gambleAmount} streaks.`
        };
    } catch (error) {
        // Rollback transaction on error
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error('Error in gambleStreak:', error);
        return { 
            success: false, 
            message: `An error occurred while gambling: ${error.message}` 
        };
    }
}

module.exports = {
    isGamblingEnabled,
    getGamblingConfig,
    updateGamblingConfig,
    getUserStreaksForGambling,
    gambleStreak
}; 