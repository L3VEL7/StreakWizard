/**
 * Unified streakManager module
 * 
 * This file imports all the individual modules and exports them as a single object.
 * This maintains backward compatibility with the original streakManager.js
 * while improving code organization and reducing memory usage.
 */

// Import individual modules
const constants = require('./constants');
const streakCore = require('./streakCore');
const triggerWords = require('./triggerWords');
const raidConfig = require('./raidConfig');
const raidHistory = require('./raidHistory');
const raidActions = require('./raidActions');

// Initialize RaidHistory table
setTimeout(async () => {
    try {
        await raidHistory.ensureRaidHistoryTable();
        console.log('RaidHistory table initialized on startup');
    } catch (error) {
        console.error('Failed to initialize RaidHistory table on startup:', error);
    }
}, 5000); // Wait 5 seconds to ensure database connection is established

// Export all modules as a single object
module.exports = {
    // Streak core functions
    getStreaks: streakCore.getStreaks,
    getUserStreaks: streakCore.getUserStreaks,
    getOrCreateStreak: streakCore.getOrCreateStreak,
    incrementStreak: streakCore.incrementStreak,
    getStreakLimit: streakCore.getStreakLimit,
    setStreakLimit: streakCore.setStreakLimit,
    getMilestone: streakCore.getMilestone,
    isStreakStreakEnabled: streakCore.isStreakStreakEnabled,
    setStreakStreakEnabled: streakCore.setStreakStreakEnabled,
    
    // Trigger word functions
    setTriggerWords: triggerWords.setTriggerWords,
    getTriggerWords: triggerWords.getTriggerWords,
    getTriggerWordsForProfile: triggerWords.getTriggerWordsForProfile,
    isValidTriggerWord: triggerWords.isValidTriggerWord,
    
    // Raid configuration functions
    getRaidConfig: raidConfig.getRaidConfig,
    updateRaidConfig: raidConfig.updateRaidConfig,
    
    // Raid history functions
    updateRaidHistory: raidHistory.updateRaidHistory,
    getRemainingRaidTime: raidHistory.getRemainingRaidTime,
    resetRaidCooldown: raidHistory.resetRaidCooldown,
    ensureRaidHistoryTable: raidHistory.ensureRaidHistoryTable,
    migrateRaidData: raidHistory.migrateRaidData,
    
    // Raid action functions
    raidUserStreak: raidActions.raidUserStreak,
    
    // Constants
    MILESTONES: constants.MILESTONES,
    STREAK_STREAK_MILESTONES: constants.STREAK_STREAK_MILESTONES
}; 