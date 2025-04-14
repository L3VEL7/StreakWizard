/**
 * Raid action functions - executing raids between users
 */
const { Streak } = require('../../database/models');
const sequelize = require('../../database/config');
const constants = require('./constants');
const { getOrCreateStreak } = require('./streakCore');
const { getRaidConfig } = require('./raidConfig');
const { updateRaidHistory, getRemainingRaidTime } = require('./raidHistory');
const { isValidTriggerWord } = require('./triggerWords');

/**
 * Execute a raid between users
 */
async function raidUserStreak(guildId, attackerId, defenderId, word) {
    try {
        // Convert IDs to strings for consistency
        guildId = String(guildId);
        attackerId = String(attackerId);
        defenderId = String(defenderId);
        
        // Check if the word is valid
        if (!word) {
            return { success: false, message: 'Invalid trigger word.' };
        }
        
        const wordIsValid = await isValidTriggerWord(guildId, word);
        if (!wordIsValid) {
            return { success: false, message: `"${word}" is not a valid trigger word in this server.` };
        }
        
        // Check if raider is trying to raid themselves
        if (attackerId === defenderId) {
            return { success: false, message: 'You cannot raid yourself!' };
        }
        
        // Get raid configuration
        const raidConfig = await getRaidConfig(guildId);
        if (!raidConfig || !raidConfig.enabled) {
            return { success: false, message: 'Raiding is currently disabled in this server.' };
        }
        
        // Check if raider has an active raid cooldown
        const cooldownInfo = await getRemainingRaidTime(guildId, attackerId);
        if (!cooldownInfo.canRaid) {
            return { success: false, message: cooldownInfo.message };
        }
        
        // Get streaks for both users
        const attackerStreak = await getOrCreateStreak(guildId, attackerId, word);
        const defenderStreak = await getOrCreateStreak(guildId, defenderId, word);
        
        // Check if defender has enough streaks to be worth raiding (at least 1)
        if (defenderStreak.count < 1) {
            return { 
                success: false, 
                message: `${defenderId} doesn't have any ${word} streaks to raid!` 
            };
        }
        
        // Execute the raid using a transaction for data consistency
        return await executeRaid(guildId, attackerId, defenderId, attackerStreak, defenderStreak, raidConfig);
    } catch (error) {
        console.error('Error in raidUserStreak:', error);
        return { 
            success: false, 
            message: `An error occurred while processing the raid: ${error.message}` 
        };
    }
}

/**
 * Execute the actual raid with transaction support
 */
async function executeRaid(guildId, attackerId, defenderId, attackerStreak, defenderStreak, raidConfig) {
    // Start a transaction
    const transaction = await sequelize.transaction();
    
    try {
        // Calculate the minimum required streak to initiate a raid
        const defenderStreakCount = defenderStreak.count || 0;
        const percentThreshold = Math.ceil((constants.ENTRY_THRESHOLD_PERCENT / 100) * defenderStreakCount);
        const requiredStreak = Math.max(constants.MIN_ENTRY_STREAK, percentThreshold);
        
        // Check if attacker has enough streaks to initiate the raid
        if (attackerStreak.count < requiredStreak) {
            // Only rollback if the transaction is still active
            if (transaction && !transaction.finished) {
                await transaction.rollback();
            }
            return { 
                success: false, 
                message: `You need at least ${requiredStreak} streaks to raid. This is the higher of: (1) minimum ${constants.MIN_ENTRY_STREAK} streaks, or (2) ${constants.ENTRY_THRESHOLD_PERCENT}% of target's ${defenderStreakCount} streaks = ${percentThreshold} streaks.` 
            };
        }
        
        // Calculate raid success chance based on various factors
        const baseSuccessChance = raidConfig.successChance || 50;
        const initiatorBonus = 10; // Bonus for initiating the raid
        
        // Progressive bonus based on streak size
        const attackerSize = attackerStreak.count;
        const progressiveBonus = Math.min(15, Math.floor(attackerSize / 10));
        
        // Success chance adjustments based on streak size ratio
        const streakRatio = defenderStreakCount > 0 ? (attackerSize / defenderStreakCount) : 1;
        
        // Calculate final success chance
        let successChance = baseSuccessChance + initiatorBonus + progressiveBonus;
        
        // Roll for success
        const successRoll = Math.random() * 100;
        const isSuccess = successRoll <= successChance;
        
        // Calculate amounts based on raid config
        const stealPercent = isSuccess ? 
            Math.random() * (raidConfig.maxStealAmount - raidConfig.minStealAmount) + raidConfig.minStealAmount : 0;
        
        let riskPercent = !isSuccess ? 
            Math.random() * (raidConfig.maxRiskAmount - raidConfig.minRiskAmount) + raidConfig.minRiskAmount : 0;
            
        // Apply underdog bonus: reduce risk for significantly smaller streaks
        if (streakRatio < 0.75) {
            riskPercent *= streakRatio; // Reduce risk based on ratio
        }
        
        // Calculate actual streak amounts to steal/risk (minimum 1)
        const stealAmount = isSuccess ? Math.max(1, Math.floor((stealPercent / 100) * defenderStreakCount)) : 0;
        const riskAmount = !isSuccess ? Math.max(1, Math.floor((riskPercent / 100) * attackerStreak.count)) : 0;
        
        // Store original values for reporting
        const attackerOldStreak = attackerStreak.count;
        const defenderOldStreak = defenderStreak.count;
        
        let attackerNewStreak = attackerStreak.count;
        let defenderNewStreak = defenderStreak.count;
        let resultMessage = '';
        
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
            await updateRaidHistory(guildId, attackerId, {
                lastRaidDate: new Date(),
                lastRaidSuccess: isSuccess
            });
        } catch (historyError) {
            console.error('Failed to update raid history, continuing anyway:', historyError);
            // Don't fail the raid due to history update issue
        }
        
        // Determine cooldown hours
        const cooldownHours = isSuccess ?
            (raidConfig.successCooldownHours || 4) :
            (raidConfig.failureCooldownHours || 2);
        
        // Calculate next raid time
        const nextRaidDate = new Date();
        nextRaidDate.setHours(nextRaidDate.getHours() + cooldownHours);
        
        // Format for Discord timestamp
        const nextRaidTimeFormatted = `<t:${Math.floor(nextRaidDate.getTime() / 1000)}:R>`;
        
        // Commit the transaction
        await transaction.commit();
        
        // Return comprehensive raid results
        return {
            success: true,
            raidSuccess: isSuccess,
            message: resultMessage,
            attackerOldStreak,
            attackerNewStreak,
            defenderOldStreak,
            defenderNewStreak,
            stealAmount,
            riskAmount,
            successChance,
            successRoll,
            baseSuccessChance,
            initiatorBonus,
            progressiveBonus,
            streakRatio,
            cooldownMessage: `You can raid again ${nextRaidTimeFormatted}.`,
            cooldownHours,
        };
    } catch (error) {
        // If there's an error, rollback the transaction if it's still active
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        console.error('Error executing raid:', error);
        throw error;
    }
}

module.exports = {
    raidUserStreak
}; 