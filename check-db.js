const { Sequelize } = require('sequelize');

// Create a connection to the database
const sequelize = new Sequelize('postgresql://postgres:HkDdfmzVdJMpCTYUwgzKVWeeSOrIFHmK@viaduct.proxy.rlwy.net:26115/railway', {
    logging: false
});

async function checkTriggerWords() {
    try {
        // Test the connection
        await sequelize.authenticate();
        console.log('Connection to database established successfully.');

        // Query for streaks with triggerWord "bm" or "grouse"
        const results = await sequelize.query(
            'SELECT "guildId", "userId", "triggerWord", "count", "streakStreak", "lastUpdated" FROM "Streaks" WHERE "triggerWord" IN (\'bm\', \'grouse\') ORDER BY "triggerWord", "count" DESC',
            { type: Sequelize.QueryTypes.SELECT }
        );

        console.log(`Found ${results.length} streak records for "bm" and "grouse":`);
        console.log(JSON.stringify(results, null, 2));

        // Also check if these trigger words are in the GuildConfig
        const guildConfigs = await sequelize.query(
            'SELECT "guildId", "triggerWords" FROM "GuildConfigs"',
            { type: Sequelize.QueryTypes.SELECT }
        );

        console.log('\nChecking if trigger words exist in GuildConfigs:');
        for (const config of guildConfigs) {
            if (!config.triggerWords) {
                console.log(`Guild ${config.guildId}: No trigger words defined`);
                continue;
            }

            const hasBm = Array.isArray(config.triggerWords) && config.triggerWords.includes('bm');
            const hasGrouse = Array.isArray(config.triggerWords) && config.triggerWords.includes('grouse');
            
            console.log(`Guild ${config.guildId}: "bm": ${hasBm ? 'Yes' : 'No'}, "grouse": ${hasGrouse ? 'Yes' : 'No'}`);
            console.log(`  All trigger words: ${Array.isArray(config.triggerWords) ? JSON.stringify(config.triggerWords) : 'CORRUPTED DATA: ' + typeof config.triggerWords}`);
        }

    } catch (error) {
        console.error('Unable to connect to the database or run query:', error);
    } finally {
        await sequelize.close();
    }
}

checkTriggerWords(); 