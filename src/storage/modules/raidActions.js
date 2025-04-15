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
 * @param {string} guildId - The guild ID
 * @param {string} attackerId - The attacker's user ID
 * @param {string} defenderId - The defender's user ID
 * @param {string} word - The trigger word for the raid
 * @param {boolean} bypassCooldown - Optional flag to bypass cooldown checks
 */
async function raidUserStreak(guildId, attackerId, defenderId, word, bypassCooldown = false) {
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
        
        // If we're not bypassing cooldowns and cooldowns are enabled, check if raider has an active cooldown
        if (!bypassCooldown && raidConfig.cooldownEnabled !== false) {
            const cooldownInfo = await getRemainingRaidTime(guildId, attackerId);
            
            // Only block if user can't raid
            if (!cooldownInfo.canRaid) {
                return { success: false, message: cooldownInfo.message };
            }
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
        
        // Set the cooldown enforcement for this raid
        raidConfig.enforceCooldown = !bypassCooldown && raidConfig.cooldownEnabled !== false;
        
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
        const initiatorBonus = 5; // Base bonus for initiating the raid
        
        // Calculate streak size ratio for difficulty adjustment
        const streakRatio = attackerStreak.count / Math.max(1, defenderStreakCount);
        
        // Calculate underdog/overdog adjustments for more diverse success chances
        let difficultyAdjustment = 0;
        let stealBonus = 0;
        let riskReduction = 0;
        
        if (streakRatio < 0.5) {
            // Significant underdog (attacker streak less than half of defender)
            difficultyAdjustment = -15; // Much harder
            stealBonus = 25; // Bigger reward if successful
            riskReduction = 0.6; // 60% risk reduction on failure
        } else if (streakRatio < 0.75) {
            // Moderate underdog
            difficultyAdjustment = -10;
            stealBonus = 15;
            riskReduction = 0.4; // 40% risk reduction
        } else if (streakRatio < 1) {
            // Slight underdog
            difficultyAdjustment = -5;
            stealBonus = 10;
            riskReduction = 0.2; // 20% risk reduction
        } else if (streakRatio > 2) {
            // Significant overdog (attacker has more than double)
            difficultyAdjustment = 15; // Much easier
            stealBonus = -5; // Smaller reward
            riskReduction = 0; // No risk reduction
        } else if (streakRatio > 1.5) {
            // Moderate overdog
            difficultyAdjustment = 10;
            stealBonus = -2;
            riskReduction = 0;
        } else if (streakRatio > 1) {
            // Slight overdog
            difficultyAdjustment = 5;
            stealBonus = 0;
            riskReduction = 0;
        }
        
        // Progressive bonus based on defender's streak size
        // This makes high-value targets harder to raid but more rewarding
        let targetValueBonus = 0;
        if (defenderStreakCount >= 100) {
            targetValueBonus = 15;
        } else if (defenderStreakCount >= 75) {
            targetValueBonus = 12;
        } else if (defenderStreakCount >= 50) {
            targetValueBonus = 9;
        } else if (defenderStreakCount >= 25) {
            targetValueBonus = 6;
        } else if (defenderStreakCount >= 10) {
            targetValueBonus = 3;
        }
        
        // Calculate final success chance
        let successChance = baseSuccessChance + initiatorBonus + difficultyAdjustment + targetValueBonus;
        
        // Ensure success chance is within reasonable bounds (10% - 90%)
        successChance = Math.max(10, Math.min(90, successChance));
        
        // Roll for success
        const successRoll = Math.random() * 100;
        const isSuccess = successRoll <= successChance;
        
        // Calculate amounts based on raid config
        const minStealAmount = raidConfig.minStealAmount || constants.DEFAULT_RAID_MIN_STEAL;
        const maxStealAmount = raidConfig.maxStealAmount || constants.DEFAULT_RAID_MAX_STEAL;
        
        // Apply steal bonus for underdogs
        const adjustedMaxSteal = maxStealAmount + stealBonus;
        
        const stealPercent = isSuccess ? 
            Math.random() * (adjustedMaxSteal - minStealAmount) + minStealAmount : 0;
        
        const minRiskAmount = raidConfig.minRiskAmount || constants.DEFAULT_RAID_MIN_RISK;
        const maxRiskAmount = raidConfig.maxRiskAmount || constants.DEFAULT_RAID_MAX_RISK;
        
        let riskPercent = !isSuccess ? 
            Math.random() * (maxRiskAmount - minRiskAmount) + minRiskAmount : 0;
            
        // Apply risk reduction for underdogs
        if (riskReduction > 0) {
            riskPercent *= (1 - riskReduction);
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
        
        // Check if cooldowns are enabled before updating raid history
        if (raidConfig.enforceCooldown) {
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
        }
        
        // Calculate next raid time if cooldowns are enabled
        let nextRaidTimeFormatted = '';
        if (raidConfig.enforceCooldown) {
            // Determine cooldown hours
            const cooldownHours = isSuccess ?
                (raidConfig.successCooldownHours || 4) :
                (raidConfig.failureCooldownHours || 2);
            
            // Calculate next raid time
            const nextRaidDate = new Date();
            nextRaidDate.setHours(nextRaidDate.getHours() + cooldownHours);
            
            // Format for Discord timestamp
            nextRaidTimeFormatted = `<t:${Math.floor(nextRaidDate.getTime() / 1000)}:R>`;
        }
        
        // Commit the transaction
        await transaction.commit();
        
        // Create a more informative result message
        let detailedMessage = '';
        
        if (isSuccess) {
            detailedMessage = `**Raid successful!** You stole ${stealAmount} streaks from <@${defenderId}>.\n`;
            detailedMessage += `Your streak increased from ${attackerOldStreak} to ${attackerNewStreak}.\n`;
        } else {
            detailedMessage = `**Raid failed!** You lost ${riskAmount} streaks to <@${defenderId}>.\n`;
            detailedMessage += `Your streak decreased from ${attackerOldStreak} to ${Math.max(1, attackerNewStreak)}.\n`;
        }
        
        // Add difficulty description
        let difficultyDesc = '';
        if (difficultyAdjustment <= -15) difficultyDesc = 'Very Hard';
        else if (difficultyAdjustment <= -10) difficultyDesc = 'Hard';
        else if (difficultyAdjustment <= -5) difficultyDesc = 'Challenging';
        else if (difficultyAdjustment >= 15) difficultyDesc = 'Very Easy';
        else if (difficultyAdjustment >= 10) difficultyDesc = 'Easy';
        else if (difficultyAdjustment >= 5) difficultyDesc = 'Somewhat Easy';
        else difficultyDesc = 'Balanced';
        
        // Add raid stats
        detailedMessage += `• **Difficulty:** ${difficultyDesc}\n`;
        detailedMessage += `• **Success Chance:** ${successChance.toFixed(1)}%\n`;
        
        // Add cooldown info if applicable
        if (nextRaidTimeFormatted) {
            detailedMessage += `• **Next Raid Available:** ${nextRaidTimeFormatted}`;
        }
        
        // Return comprehensive raid results
        return {
            success: true,
            raidSuccess: isSuccess,
            message: resultMessage,
            detailedMessage: detailedMessage,
            attackerOldStreak,
            attackerNewStreak,
            defenderOldStreak,
            defenderNewStreak,
            stealAmount,
            riskAmount,
            successChance,
            successRoll,
            baseSuccessChance,
            difficultyAdjustment,
            stealBonus,
            riskReduction,
            targetValueBonus,
            cooldownEnabled: raidConfig.cooldownEnabled,
            nextRaidTime: nextRaidTimeFormatted || 'No cooldown'
        };
    } catch (error) {
        // Rollback transaction on error if it's still active
        if (transaction && !transaction.finished) {
            await transaction.rollback();
        }
        
        console.error('Error in executeRaid:', error);
        throw error;
    }
}

module.exports = {
    raidUserStreak
}; 