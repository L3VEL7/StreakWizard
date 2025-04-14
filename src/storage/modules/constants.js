/**
 * Constants used throughout the streak management system
 */

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
    MILESTONES,
    STREAK_STREAK_MILESTONES,
    
    // Default values
    DEFAULT_RAID_SUCCESS_CHANCE: 50,
    DEFAULT_RAID_MIN_STEAL: 5,
    DEFAULT_RAID_MAX_STEAL: 30,
    DEFAULT_RAID_MIN_RISK: 3,
    DEFAULT_RAID_MAX_RISK: 20,
    DEFAULT_SUCCESS_COOLDOWN_HOURS: 4,
    DEFAULT_FAILURE_COOLDOWN_HOURS: 2,
    
    // Raid constants
    MIN_REQUIRED_STREAK: 5,
    ENTRY_THRESHOLD_PERCENT: 20,
    MIN_ENTRY_STREAK: 5
}; 