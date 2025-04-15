/**
 * Raid history management
 */
const { RaidHistory, Streak } = require('../../database/models');
const sequelize = require('../../database/config');
const { getRaidConfig } = require('./raidConfig');

/**
 * Update a user's raid history
 */
async function updateRaidHistory(guildId, userId, historyUpdate) {
    try {
        guildId = String(guildId);
        userId = String(userId);
        
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
    } catch (error) {
        console.error(`Error updating raid history for user ${userId} in guild ${guildId}:`, error);
        throw error;
    }
}

/**
 * Get remaining time before a user can raid again
 */
async function getRemainingRaidTime(guildId, userId) {
    try {
        // Get raid config
        const config = await getRaidConfig(guildId);
        
        // If raid is disabled, return that user can't raid
        if (!config.enabled) {
            return {
                canRaid: false,
                message: 'Raiding is currently disabled in this server.'
            };
        }
        
        // If cooldowns are disabled, user can raid regardless of history
        if (config.cooldownEnabled === false) {
            return {
                canRaid: true,
                cooldownsDisabled: true,
                message: 'Raid cooldowns are disabled. You can raid anytime.'
            };
        }
        
        // Get user's raid history
        const userRaidHistory = await RaidHistory.findOne({
            where: { guildId: String(guildId), userId: String(userId) }
        });
        
        // If no history or no last raid date, they can raid
        if (!userRaidHistory || !userRaidHistory.lastRaidDate) {
            return {
                canRaid: true,
                message: 'You can raid now.'
            };
        }
        
        const now = new Date();
        const lastRaidDate = new Date(userRaidHistory.lastRaidDate);
        
        // Get appropriate cooldown based on last raid success
        const cooldownHours = userRaidHistory.lastRaidSuccess ?
            (config.successCooldownHours || 4) :
            (config.failureCooldownHours || 2);
        
        // Calculate when cooldown expires
        const cooldownExpiry = new Date(lastRaidDate);
        cooldownExpiry.setHours(cooldownExpiry.getHours() + cooldownHours);
        
        // Check if cooldown has expired
        if (now >= cooldownExpiry) {
            return {
                canRaid: true,
                message: 'You can raid now.'
            };
        }
        
        // Calculate remaining time
        const remainingTime = Math.floor((cooldownExpiry - now) / 1000);
        
        // Format time for Discord timestamp
        const remainingTimeFormatted = `<t:${Math.floor(cooldownExpiry.getTime() / 1000)}:R>`;
        
        // Return cooldown info
        return {
            canRaid: false,
            message: `You're on raid cooldown. You can raid again ${remainingTimeFormatted}.`,
            remainingTime,
            cooldownExpiry,
            wasSuccessful: userRaidHistory.lastRaidSuccess
        };
    } catch (error) {
        console.error(`Error checking raid cooldown for user ${userId} in guild ${guildId}:`, error);
        throw error;
    }
}

/**
 * Admin function to reset a user's raid cooldown
 */
async function resetRaidCooldown(guildId, userId, isAdmin = false) {
    try {
        // Safety check to prevent accidental usage
        if (!isAdmin) {
            return {
                success: false,
                message: 'This function is restricted to admin use only. Set isAdmin to true to confirm.'
            };
        }

        guildId = String(guildId);
        userId = String(userId);
        
        // Find the user's raid history
        const userRaidHistory = await RaidHistory.findOne({
            where: { guildId, userId }
        });
        
        if (!userRaidHistory) {
            return {
                success: false,
                message: `No raid history found for user ID ${userId} in guild ${guildId}`
            };
        }
        
        // Reset the lastRaidDate to a date in the past (1 day ago to ensure any cooldown has expired)
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);
        
        await userRaidHistory.update({
            lastRaidDate: pastDate
        });
        
        return {
            success: true,
            message: `Successfully reset raid cooldown for user ID ${userId}. They can now raid immediately.`
        };
    } catch (error) {
        console.error('Error resetting raid cooldown:', error);
        return {
            success: false,
            message: `Error resetting raid cooldown: ${error.message}`
        };
    }
}

/**
 * Ensure the RaidHistory table exists
 */
async function ensureRaidHistoryTable() {
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

/**
 * Migrate raid data from Streak table to RaidHistory table
 */
async function migrateRaidData(guildId) {
    try {
        // Find streaks with raid data
        const streaksWithRaidData = await Streak.findAll({
            where: {
                guildId,
                lastRaidDate: {
                    [sequelize.Op.not]: null
                }
            }
        });
        
        console.log(`Found ${streaksWithRaidData.length} streaks with raid data for guild ${guildId}`);
        
        // Counter for migrated records
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
        throw error;
    }
}

module.exports = {
    updateRaidHistory,
    getRemainingRaidTime,
    resetRaidCooldown,
    ensureRaidHistoryTable,
    migrateRaidData
}; 