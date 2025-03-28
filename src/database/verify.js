const { GuildConfig, Streak } = require('./models');

async function verifyDatabase() {
    try {
        console.log('Starting detailed database verification...');

        // Check GuildConfigs
        console.log('\n=== Checking GuildConfigs ===');
        const guildConfigs = await GuildConfig.findAll();
        console.log(`Total GuildConfigs: ${guildConfigs.length}`);
        
        // Check for invalid trigger words in configs
        const invalidConfigTriggerWords = [];
        for (const config of guildConfigs) {
            if (!Array.isArray(config.triggerWords)) {
                invalidConfigTriggerWords.push({
                    guildId: config.guildId,
                    error: 'triggerWords is not an array'
                });
            } else {
                for (const word of config.triggerWords) {
                    if (typeof word !== 'string' || word.trim() === '') {
                        invalidConfigTriggerWords.push({
                            guildId: config.guildId,
                            word,
                            error: 'Invalid trigger word format'
                        });
                    }
                }
            }
        }
        
        if (invalidConfigTriggerWords.length > 0) {
            console.log('\nFound invalid trigger words in configs:');
            console.log(JSON.stringify(invalidConfigTriggerWords, null, 2));
        }

        // Check Streaks
        console.log('\n=== Checking Streaks ===');
        const streaks = await Streak.findAll();
        console.log(`Total Streaks: ${streaks.length}`);
        
        // Check for data inconsistencies
        const inconsistencies = [];
        
        // 1. Check for streaks with invalid counts
        const invalidCounts = streaks.filter(s => s.count < 0 || s.bestStreak < 0 || s.streakStreak < 0);
        if (invalidCounts.length > 0) {
            inconsistencies.push({
                type: 'Invalid counts',
                count: invalidCounts.length,
                examples: invalidCounts.slice(0, 3).map(s => ({
                    id: s.id,
                    userId: s.userId,
                    count: s.count,
                    bestStreak: s.bestStreak,
                    streakStreak: s.streakStreak
                }))
            });
        }

        // 2. Check for streaks with bestStreak less than count
        const bestStreakIssues = streaks.filter(s => s.bestStreak < s.count);
        if (bestStreakIssues.length > 0) {
            inconsistencies.push({
                type: 'Best streak less than current count',
                count: bestStreakIssues.length,
                examples: bestStreakIssues.slice(0, 3).map(s => ({
                    id: s.id,
                    userId: s.userId,
                    count: s.count,
                    bestStreak: s.bestStreak
                }))
            });
        }

        // 3. Check for streaks with invalid dates
        const invalidDates = streaks.filter(s => {
            if (s.lastStreakDate) {
                const date = new Date(s.lastStreakDate);
                return isNaN(date.getTime()) || date > new Date();
            }
            return false;
        });
        if (invalidDates.length > 0) {
            inconsistencies.push({
                type: 'Invalid dates',
                count: invalidDates.length,
                examples: invalidDates.slice(0, 3).map(s => ({
                    id: s.id,
                    userId: s.userId,
                    lastStreakDate: s.lastStreakDate
                }))
            });
        }

        // 4. Check for orphaned streaks (no matching guild config)
        const orphanedStreaks = streaks.filter(s => 
            !guildConfigs.some(gc => gc.guildId === s.guildId)
        );
        if (orphanedStreaks.length > 0) {
            inconsistencies.push({
                type: 'Orphaned streaks',
                count: orphanedStreaks.length,
                examples: orphanedStreaks.slice(0, 3).map(s => ({
                    id: s.id,
                    guildId: s.guildId,
                    userId: s.userId
                }))
            });
        }

        // 5. Check for streaks with trigger words not in guild config
        const invalidStreakTriggerWords = [];
        for (const streak of streaks) {
            const guildConfig = guildConfigs.find(gc => gc.guildId === streak.guildId);
            if (guildConfig && !guildConfig.triggerWords.includes(streak.triggerWord)) {
                invalidStreakTriggerWords.push({
                    id: streak.id,
                    guildId: streak.guildId,
                    userId: streak.userId,
                    triggerWord: streak.triggerWord,
                    validWords: guildConfig.triggerWords
                });
            }
        }
        if (invalidStreakTriggerWords.length > 0) {
            inconsistencies.push({
                type: 'Invalid trigger words in streaks',
                count: invalidStreakTriggerWords.length,
                examples: invalidStreakTriggerWords.slice(0, 3)
            });
        }

        // Print statistics
        console.log('\n=== Streak Statistics ===');
        const totalCount = streaks.reduce((sum, streak) => sum + streak.count, 0);
        const maxStreak = Math.max(...streaks.map(s => s.count));
        const uniqueUsers = new Set(streaks.map(s => s.userId)).size;
        const uniqueGuilds = new Set(streaks.map(s => s.guildId)).size;
        
        console.log(`Total streak count: ${totalCount}`);
        console.log(`Highest streak: ${maxStreak}`);
        console.log(`Unique users: ${uniqueUsers}`);
        console.log(`Unique guilds: ${uniqueGuilds}`);

        // Print inconsistencies
        if (inconsistencies.length > 0) {
            console.log('\n=== Found Data Inconsistencies ===');
            console.log(JSON.stringify(inconsistencies, null, 2));
        } else {
            console.log('\nNo data inconsistencies found!');
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