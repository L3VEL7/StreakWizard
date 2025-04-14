/**
 * Admin script to test raid functionality
 * 
 * Usage:
 * node src/admin/testRaid.js <guildId> <attackerId> <defenderId> [triggerWord]
 */

const streakManager = require('../storage/streakManager');

async function main() {
    try {
        // Get command line arguments
        const args = process.argv.slice(2);
        
        if (args.length < 3) {
            console.error('Usage: node src/admin/testRaid.js <guildId> <attackerId> <defenderId> [triggerWord]');
            process.exit(1);
        }
        
        const guildId = args[0];
        const attackerId = args[1];
        const defenderId = args[2];
        const triggerWord = args[3] || 'raid'; // Default trigger word
        
        console.log('===========================================');
        console.log('Starting test raid with the following parameters:');
        console.log('===========================================');
        console.log('Guild ID:', guildId);
        console.log('Attacker ID:', attackerId);
        console.log('Defender ID:', defenderId);
        console.log('Trigger Word:', triggerWord);
        console.log('===========================================');
        
        // Check attacker's cooldown status first
        console.log('\nChecking attacker\'s cooldown status before raid:');
        const cooldownInfo = await streakManager.getRemainingRaidTime(guildId, attackerId);
        if (!cooldownInfo.canRaid) {
            console.log('❌ Attacker is on cooldown and cannot raid yet');
            console.log('Message:', cooldownInfo.message);
            
            // Ask if the user wants to reset the cooldown
            console.log('\nWould you like to reset the cooldown timer? (Y/N)');
            process.stdout.write('> ');
            
            process.stdin.once('data', async (data) => {
                const input = data.toString().trim().toUpperCase();
                if (input === 'Y' || input === 'YES') {
                    console.log('Resetting cooldown...');
                    await streakManager.resetRaidCooldown(guildId, attackerId, true);
                    console.log('Cooldown reset, proceeding with raid...');
                    await performRaid(guildId, attackerId, defenderId, triggerWord);
                } else {
                    console.log('Raid aborted. Please try again later when the cooldown expires.');
                    process.exit(0);
                }
            });
        } else {
            console.log('✅ Attacker can raid now');
            await performRaid(guildId, attackerId, defenderId, triggerWord);
        }
    } catch (error) {
        console.error('Failed to test raid functionality:', error);
        process.exit(1);
    }
}

async function performRaid(guildId, attackerId, defenderId, triggerWord) {
    try {
        console.log('\n===========================================');
        console.log('Executing raid...');
        console.log('===========================================');
        
        const result = await streakManager.raidUserStreak(
            guildId, 
            attackerId, 
            defenderId, 
            triggerWord
        );
        
        console.log('\nRaid Result:');
        console.log('===========================================');
        console.log('Success:', result.success ? '✅ Yes' : '❌ No');
        console.log('Message:', result.message);
        
        // Check attacker's cooldown status after raid
        console.log('\nChecking cooldown status after raid:');
        const postRaidCooldown = await streakManager.getRemainingRaidTime(guildId, attackerId);
        console.log(postRaidCooldown.canRaid ? '✅ User can raid again' : '❌ User is now on cooldown');
        if (!postRaidCooldown.canRaid) {
            console.log('Message:', postRaidCooldown.message);
            if (postRaidCooldown.cooldownExpiry) {
                console.log('Cooldown Expires:', new Date(postRaidCooldown.cooldownExpiry).toLocaleString());
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error during raid:', error);
        process.exit(1);
    }
}

// Initialize the process
main(); 