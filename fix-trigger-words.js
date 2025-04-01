const { Sequelize } = require('sequelize');

// Database connection string
const connectionString = 'postgresql://postgres:HkDdfmzVdJMpCTYUwgzKVWeeSOrIFHmK@viaduct.proxy.rlwy.net:26115/railway';

// Create a connection to the database
const sequelize = new Sequelize(connectionString, {
    logging: false
});

async function fixTriggerWords() {
    try {
        // Test the connection
        await sequelize.authenticate();
        console.log('Connection to database established successfully.');
        
        // First check what's currently in the GuildConfig
        const guildId = '1092548123768930304'; // The guild ID from the database records
        
        // Get the current config using direct SQL
        const configResult = await sequelize.query(
            'SELECT "guildId", "triggerWords" FROM "GuildConfigs" WHERE "guildId" = :guildId',
            {
                replacements: { guildId },
                type: sequelize.QueryTypes.SELECT
            }
        );
        
        const config = configResult.length > 0 ? configResult[0] : null;
        console.log("Current trigger words:", config ? JSON.stringify(config.triggerWords) : "No config found");
        
        // Collect all distinct trigger words from Streaks table
        const streakWords = await sequelize.query(
            'SELECT DISTINCT "triggerWord" FROM "Streaks" WHERE "guildId" = :guildId',
            {
                replacements: { guildId },
                type: sequelize.QueryTypes.SELECT
            }
        );
        
        const triggerWordsFromStreaks = streakWords.map(row => row.triggerWord);
        console.log("Trigger words found in Streaks table:", triggerWordsFromStreaks);
        
        // Let's directly run a SQL query with proper array syntax
        // For simplicity, we'll rely on Postgres to do the heavy lifting
        
        try {
            // We'll use a PostgreSQL function to handle updating the array
            const query = `
                UPDATE "GuildConfigs" 
                SET "triggerWords" = ARRAY[${triggerWordsFromStreaks.map(word => `'${word}'`).join(', ')}]::text[],
                    "updatedAt" = NOW()
                WHERE "guildId" = :guildId;
                
                -- If no record exists, insert one
                INSERT INTO "GuildConfigs" ("guildId", "triggerWords", "createdAt", "updatedAt") 
                SELECT :guildId, ARRAY[${triggerWordsFromStreaks.map(word => `'${word}'`).join(', ')}]::text[], NOW(), NOW()
                WHERE NOT EXISTS (
                    SELECT 1 FROM "GuildConfigs" WHERE "guildId" = :guildId
                );
            `;
            
            console.log("Running query:", query);
            
            await sequelize.query(query, {
                replacements: { guildId },
                type: sequelize.QueryTypes.RAW
            });
            
            console.log("Query executed successfully.");
        } catch (directError) {
            console.error("Error executing direct query:", directError);
            
            // Fallback to a simpler approach
            console.log("Trying fallback approach");
            
            // Create a simple query with explicit values
            const fallbackQuery = `
                UPDATE "GuildConfigs" 
                SET "triggerWords" = ARRAY['bm', 'grouse']::text[],
                    "updatedAt" = NOW()
                WHERE "guildId" = '${guildId}';
                
                INSERT INTO "GuildConfigs" ("guildId", "triggerWords", "createdAt", "updatedAt") 
                SELECT '${guildId}', ARRAY['bm', 'grouse']::text[], NOW(), NOW()
                WHERE NOT EXISTS (
                    SELECT 1 FROM "GuildConfigs" WHERE "guildId" = '${guildId}'
                );
            `;
            
            console.log("Running fallback query:", fallbackQuery);
            
            await sequelize.query(fallbackQuery, {
                type: sequelize.QueryTypes.RAW
            });
            
            console.log("Fallback query executed successfully.");
        }
        
        // Verify the update
        const verificationResult = await sequelize.query(
            'SELECT "guildId", "triggerWords" FROM "GuildConfigs" WHERE "guildId" = :guildId',
            {
                replacements: { guildId },
                type: sequelize.QueryTypes.SELECT
            }
        );
        
        const updatedConfig = verificationResult.length > 0 ? verificationResult[0] : null;
        console.log("Trigger words after update:", updatedConfig ? JSON.stringify(updatedConfig.triggerWords) : "No config found");
        
        console.log("\nSuccess! The trigger words have been fixed.");
        console.log("Users should now be able to use these words for streaks.");

    } catch (error) {
        console.error('Error fixing trigger words:', error);
    } finally {
        await sequelize.close();
    }
}

fixTriggerWords(); 