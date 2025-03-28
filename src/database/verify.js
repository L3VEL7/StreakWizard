const { GuildConfig, Streak } = require('./models');

async function verifyDatabase() {
    try {
        console.log('Starting database verification...');

        // Check GuildConfigs
        console.log('\nChecking GuildConfigs:');
        const guildConfigs = await GuildConfig.findAll();
        console.log(`Total GuildConfigs: ${guildConfigs.length}`);
        
        if (guildConfigs.length > 0) {
            console.log('\nSample GuildConfig:');
            console.log(JSON.stringify(guildConfigs[0].toJSON(), null, 2));
        }

        // Check Streaks
        console.log('\nChecking Streaks:');
        const streaks = await Streak.findAll();
        console.log(`Total Streaks: ${streaks.length}`);
        
        if (streaks.length > 0) {
            console.log('\nSample Streak:');
            console.log(JSON.stringify(streaks[0].toJSON(), null, 2));
            
            // Get some statistics
            const totalCount = streaks.reduce((sum, streak) => sum + streak.count, 0);
            const maxStreak = Math.max(...streaks.map(s => s.count));
            const uniqueUsers = new Set(streaks.map(s => s.userId)).size;
            const uniqueGuilds = new Set(streaks.map(s => s.guildId)).size;
            
            console.log('\nStreak Statistics:');
            console.log(`Total streak count: ${totalCount}`);
            console.log(`Highest streak: ${maxStreak}`);
            console.log(`Unique users: ${uniqueUsers}`);
            console.log(`Unique guilds: ${uniqueGuilds}`);
        }

        console.log('\nVerification completed successfully');
    } catch (error) {
        console.error('Error verifying database:', error);
        throw error;
    }
}

// Run verification if this file is run directly
if (require.main === module) {
    verifyDatabase()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('Verification failed:', error);
            process.exit(1);
        });
}

module.exports = verifyDatabase; 