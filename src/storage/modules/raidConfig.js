/**
 * Raid configuration management
 */
const { GuildConfig } = require('../../database/models');
const constants = require('./constants');

/**
 * Get raid configuration for a guild
 */
async function getRaidConfig(guildId) {
    try {
        const config = await GuildConfig.findByPk(guildId);
        
        if (!config) {
            // Return default config
            return {
                enabled: false,
                successChance: constants.DEFAULT_RAID_SUCCESS_CHANCE,
                minStealAmount: constants.DEFAULT_RAID_MIN_STEAL,
                maxStealAmount: constants.DEFAULT_RAID_MAX_STEAL,
                minRiskAmount: constants.DEFAULT_RAID_MIN_RISK,
                maxRiskAmount: constants.DEFAULT_RAID_MAX_RISK,
                successCooldownHours: constants.DEFAULT_SUCCESS_COOLDOWN_HOURS,
                failureCooldownHours: constants.DEFAULT_FAILURE_COOLDOWN_HOURS,
                cooldownEnabled: true
            };
        }
        
        // Return config with defaults for missing values
        return {
            enabled: config.raidEnabled || false,
            successChance: config.raidSuccessChance || constants.DEFAULT_RAID_SUCCESS_CHANCE,
            minStealAmount: config.raidMinStealAmount || constants.DEFAULT_RAID_MIN_STEAL,
            maxStealAmount: config.raidMaxStealAmount || constants.DEFAULT_RAID_MAX_STEAL,
            minRiskAmount: config.raidMinRiskAmount || constants.DEFAULT_RAID_MIN_RISK,
            maxRiskAmount: config.raidMaxRiskAmount || constants.DEFAULT_RAID_MAX_RISK,
            successCooldownHours: config.raidSuccessCooldownHours || constants.DEFAULT_SUCCESS_COOLDOWN_HOURS,
            failureCooldownHours: config.raidFailureCooldownHours || constants.DEFAULT_FAILURE_COOLDOWN_HOURS,
            cooldownEnabled: config.raidCooldownEnabled !== undefined ? config.raidCooldownEnabled : true
        };
    } catch (error) {
        console.error(`Error getting raid config for guild ${guildId}:`, error);
        throw error;
    }
}

/**
 * Update raid configuration for a guild
 */
async function updateRaidConfig(guildId, config) {
    try {
        // Validate config
        if (config.successChance && (config.successChance < 0 || config.successChance > 100)) {
            throw new Error('Success chance must be between 0 and 100');
        }
        
        // Apply the updates to the database
        await GuildConfig.upsert({
            guildId,
            raidEnabled: config.enabled !== undefined ? config.enabled : undefined,
            raidSuccessChance: config.successChance,
            raidMinStealAmount: config.minStealAmount,
            raidMaxStealAmount: config.maxStealAmount,
            raidMinRiskAmount: config.minRiskAmount,
            raidMaxRiskAmount: config.maxRiskAmount,
            raidSuccessCooldownHours: config.successCooldownHours,
            raidFailureCooldownHours: config.failureCooldownHours,
            raidCooldownEnabled: config.cooldownEnabled !== undefined ? config.cooldownEnabled : undefined
        });
        
        return await getRaidConfig(guildId);
    } catch (error) {
        console.error(`Error updating raid config for guild ${guildId}:`, error);
        throw error;
    }
}

module.exports = {
    getRaidConfig,
    updateRaidConfig
}; 