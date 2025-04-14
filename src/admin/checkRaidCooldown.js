/**
 * Admin script to check a user's raid cooldown status
 * 
 * Usage:
 * node src/admin/checkRaidCooldown.js <guildId> <userId>
 */

const streakManager = require('../storage/streakManager');
const { RaidHistory } = require('../database/models');

async function main() {
    try {
        // Get command line arguments
        const args = process.argv.slice(2);
        
        if (args.length < 2) {
            console.error('Usage: node src/admin/checkRaidCooldown.js <guildId> <userId>');
            process.exit(1);
        }
        
        const guildId = args[0];
        const userId = args[1];
        
        console.log(`Checking raid cooldown for user ${userId} in guild ${guildId}...`);
        
        // Get user's raid history
        const userRaidHistory = await RaidHistory.findOne({
            where: { 
                guildId: String(guildId), 
                userId: String(userId) 
            }
        });
        
        if (!userRaidHistory) {
            console.log('❓ No raid history found for this user');
            process.exit(0);
        }
        
        console.log('\nRaid History Data:');
        console.log('------------------');
        console.log('Last Raid Date:', userRaidHistory.lastRaidDate ? 
            new Date(userRaidHistory.lastRaidDate).toLocaleString() : 'Never');
        console.log('Last Raid Success:', userRaidHistory.lastRaidSuccess ? 'Yes' : 'No');
        console.log('Total Raids:', userRaidHistory.totalRaids);
        console.log('Successful Raids:', userRaidHistory.successfulRaids);
        
        // Check current cooldown status
        const cooldownInfo = await streakManager.getRemainingRaidTime(guildId, userId);
        console.log('\nCurrent Raid Status:');
        console.log('------------------');
        console.log(cooldownInfo.canRaid ? '✅ User can raid now' : '❌ User is on cooldown');
        
        if (!cooldownInfo.canRaid) {
            console.log('Message:', cooldownInfo.message);
            if (cooldownInfo.cooldownExpiry) {
                console.log('Cooldown Expires:', new Date(cooldownInfo.cooldownExpiry).toLocaleString());
                
                // Calculate time remaining
                const now = new Date();
                const remaining = cooldownInfo.cooldownExpiry - now;
                const minutesRemaining = Math.floor(remaining / 60000);
                console.log('Time Remaining:', minutesRemaining, 'minutes');
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Failed to check raid cooldown:', error);
        process.exit(1);
    }
}

// Initialize the process
main(); 