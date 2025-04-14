/**
 * Admin script to reset a user's raid cooldown
 * 
 * Usage:
 * node src/admin/resetRaidCooldown.js <guildId> <userId>
 */

const streakManager = require('../storage/streakManager');

async function main() {
    try {
        // Get command line arguments
        const args = process.argv.slice(2);
        
        if (args.length < 2) {
            console.error('Usage: node src/admin/resetRaidCooldown.js <guildId> <userId>');
            process.exit(1);
        }
        
        const guildId = args[0];
        const userId = args[1];
        
        console.log(`Attempting to reset raid cooldown for user ${userId} in guild ${guildId}...`);
        
        // Call the reset function with admin privileges
        const result = await streakManager.resetRaidCooldown(guildId, userId, true);
        
        if (result.success) {
            console.log('✅', result.message);
        } else {
            console.error('❌', result.message);
        }
        
        // Check current cooldown status
        const cooldownInfo = await streakManager.getRemainingRaidTime(guildId, userId);
        console.log('\nCurrent raid status:');
        console.log(cooldownInfo.canRaid ? '✅ User can raid now' : '❌ User is still on cooldown');
        if (!cooldownInfo.canRaid) {
            console.log('Message:', cooldownInfo.message);
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Failed to reset raid cooldown:', error);
        process.exit(1);
    }
}

// Initialize the process
main(); 