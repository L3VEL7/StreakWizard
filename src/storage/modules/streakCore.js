/**
 * Core streak management functions
 */
const { Streak, GuildConfig, ServerConfig } = require('../../database/models');
const { Sequelize, Op } = require('sequelize');
const sequelize = require('../../database/config');
const constants = require('./constants');

/**
 * Get all streaks for a guild, optionally filtered by trigger word
 */
async function getStreaks(guildId, word = null) {
    try {
        const whereClause = { guildId };
        
        if (word) {
            // Case-insensitive search for the word
            whereClause.triggerWord = Sequelize.where(
                Sequelize.fn('LOWER', Sequelize.col('triggerWord')),
                Sequelize.fn('LOWER', word)
            );
        }
        
        const streaks = await Streak.findAll({
            where: whereClause,
            order: [['count', 'DESC']]
        });
        
        return streaks;
    } catch (error) {
        console.error('Error fetching streaks:', error);
        throw error;
    }
}

/**
 * Get streaks for a specific user
 */
async function getUserStreaks(guildId, userId) {
    try {
        const streaks = await Streak.findAll({
            where: {
                guildId,
                userId
            }
        });
        
        return streaks;
    } catch (error) {
        console.error('Error fetching user streaks:', error);
        throw error;
    }
}

/**
 * Get or create a streak for a user
 */
async function getOrCreateStreak(guildId, userId, triggerWord) {
    let streak = await Streak.findOne({
        where: {
            guildId,
            userId,
            triggerWord
        }
    });
    
    if (!streak) {
        streak = await Streak.create({
            guildId,
            userId,
            triggerWord,
            count: 0,
            bestStreak: 0,
            updatedAt: new Date(),
            missedCount: 0,
            streakUpdatedAt: null
        });
    }
    
    return streak;
}

/**
 * Increment a user's streak
 */
async function incrementStreak(guildId, userId, triggerWord) {
    // Transaction for data consistency
    const transaction = await sequelize.transaction();
    
    try {
        let streak = await getOrCreateStreak(guildId, userId, triggerWord);
        
        // Get the streak limit for time window
        const limitMinutes = await getStreakLimit(guildId);
        const lastUpdate = streak.updatedAt;
        const now = new Date();
        
        // Check if the streak is within the time limit
        if (lastUpdate && limitMinutes > 0) {
            const minutesSinceLastUpdate = (now - lastUpdate) / (1000 * 60);
            
            // If it's too soon, don't increment
            if (minutesSinceLastUpdate < limitMinutes) {
                await transaction.commit();
                return {
                    streak,
                    incremented: false,
                    message: `Streak not incremented: Too soon since last update (${Math.round(minutesSinceLastUpdate)} < ${limitMinutes} minutes)`
                };
            }
        }
        
        // Increment the streak
        streak.count += 1;
        
        // Update the best streak if needed
        if (streak.count > streak.bestStreak) {
            streak.bestStreak = streak.count;
        }
        
        // Reset missed count
        streak.missedCount = 0;
        
        // Update timestamps
        streak.updatedAt = now;
        streak.streakUpdatedAt = now;
        
        await streak.save({ transaction });
        await transaction.commit();
        
        return {
            streak,
            incremented: true,
            milestone: getMilestone(streak.count),
            message: `Streak incremented to ${streak.count}`
        };
    } catch (error) {
        // Make sure to rollback on error
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error('Error incrementing streak:', error);
        throw error;
    }
}

/**
 * Get the streak limit from guild configuration
 */
async function getStreakLimit(guildId) {
    try {
        const config = await GuildConfig.findByPk(guildId);
        return config ? (config.streakLimitMinutes || 0) : 0;
    } catch (error) {
        console.error('Error getting streak limit:', error);
        return 0; // Default to no limit
    }
}

/**
 * Set the streak time limit for a guild
 */
async function setStreakLimit(guildId, minutes) {
    try {
        await GuildConfig.upsert({
            guildId,
            streakLimitMinutes: minutes
        });
        return true;
    } catch (error) {
        console.error('Error setting streak limit:', error);
        throw error;
    }
}

/**
 * Get milestone information for a streak count
 */
function getMilestone(count) {
    for (let i = constants.MILESTONES.length - 1; i >= 0; i--) {
        if (count === constants.MILESTONES[i].level) {
            return constants.MILESTONES[i];
        }
    }
    return null;
}

/**
 * Check if streak streak feature is enabled for a guild
 */
async function isStreakStreakEnabled(guildId) {
    try {
        const config = await GuildConfig.findByPk(guildId);
        return config ? !!config.streakStreakEnabled : false;
    } catch (error) {
        console.error('Error checking if streak streak is enabled:', error);
        return false; // Default to disabled
    }
}

/**
 * Set whether streak streak is enabled for a guild
 */
async function setStreakStreakEnabled(guildId, enabled) {
    try {
        await GuildConfig.upsert({
            guildId,
            streakStreakEnabled: !!enabled
        });
        return true;
    } catch (error) {
        console.error('Error setting streak streak enabled:', error);
        throw error;
    }
}

/**
 * Calculate the remaining time before a streak can be incremented again
 */
async function getRemainingTime(guildId, userId, triggerWord) {
    try {
        const streak = await Streak.findOne({
            where: {
                guildId,
                userId,
                triggerWord
            }
        });
        
        if (!streak || !streak.lastUpdated) {
            return null;
        }
        
        // Get streak time limit from guild config
        const limitMinutes = await getStreakLimit(guildId);
        
        // If there's no limit, return null (no waiting time)
        if (!limitMinutes) {
            return null;
        }
        
        // Calculate time passed since last update
        const now = new Date();
        const lastUpdated = new Date(streak.lastUpdated);
        const diffMilliseconds = now - lastUpdated;
        const diffMinutes = Math.floor(diffMilliseconds / (1000 * 60));
        
        // If enough time has passed, return null (can update)
        if (diffMinutes >= limitMinutes) {
            return null;
        }
        
        // Calculate remaining time
        const remainingMinutes = limitMinutes - diffMinutes;
        const hours = Math.floor(remainingMinutes / 60);
        const minutes = remainingMinutes % 60;
        
        return {
            hours,
            minutes,
            totalMinutes: remainingMinutes
        };
    } catch (error) {
        console.error('Error calculating remaining time:', error);
        return null;
    }
}

/**
 * Reset a user's streak for a specific trigger word
 */
async function resetStreak(guildId, userId, triggerWord) {
    try {
        const streak = await Streak.findOne({
            where: {
                guildId,
                userId,
                triggerWord
            }
        });
        
        if (!streak) {
            return {
                success: false,
                message: `No streak found for word "${triggerWord}"`
            };
        }
        
        // Store old value for reporting
        const oldCount = streak.count;
        
        // Reset the streak count to 0
        await streak.update({
            count: 0,
            missedCount: 0,
            streakUpdatedAt: new Date()
        });
        
        return {
            success: true,
            oldCount,
            message: `Reset streak for "${triggerWord}" from ${oldCount} to 0`
        };
    } catch (error) {
        console.error('Error resetting streak:', error);
        return {
            success: false,
            message: `Error resetting streak: ${error.message}`
        };
    }
}

module.exports = {
    getStreaks,
    getUserStreaks,
    getOrCreateStreak,
    incrementStreak,
    getStreakLimit,
    setStreakLimit,
    getMilestone,
    isStreakStreakEnabled,
    setStreakStreakEnabled,
    getRemainingTime,
    resetStreak
}; 