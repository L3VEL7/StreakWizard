/**
 * Trigger word management functions
 */
const { GuildConfig } = require('../../database/models');
const sequelize = require('../../database/config');

/**
 * Set trigger words for a guild
 */
async function setTriggerWords(guildId, words) {
    if (!Array.isArray(words)) {
        console.error('Invalid input: words must be an array');
        throw new Error('Invalid input: words must be an array');
    }

    // Enhanced validation and processing of words
    const processedWords = words
        .filter(word => word && typeof word === 'string')
        .map(word => word.toLowerCase().trim())
        .filter(word => word.length > 0);

    if (processedWords.length === 0) {
        console.error('No valid words provided');
        throw new Error('No valid words provided');
    }

    console.log(`Setting trigger words for guild ${guildId}:`, processedWords);

    try {
        // Get existing config first
        let config = await GuildConfig.findByPk(guildId);
        const existingWords = config ? config.triggerWords : [];
        
        // Combine existing and new words, removing duplicates
        const combinedWords = [...new Set([...existingWords, ...processedWords])];
        
        [config] = await GuildConfig.upsert({
            guildId,
            triggerWords: combinedWords
        }, {
            returning: true
        });

        console.log('Successfully saved trigger words. Current config:', config.toJSON());
        return processedWords;
    } catch (error) {
        console.error('Error saving trigger words:', error);
        throw error;
    }
}

/**
 * Get trigger words for a guild
 */
async function getTriggerWords(guildId) {
    try {
        // First try direct SQL query for debugging
        try {
            const rawResult = await sequelize.query(
                `SELECT "triggerWords" FROM "GuildConfigs" WHERE "guildId" = :guildId`,
                {
                    replacements: { guildId },
                    type: sequelize.QueryTypes.SELECT,
                    raw: true
                }
            );
            console.log(`Raw SQL result for trigger words:`, JSON.stringify(rawResult));
        } catch (sqlError) {
            console.error(`SQL error fetching trigger words:`, sqlError);
        }
        
        const config = await GuildConfig.findByPk(guildId);

        if (!config) {
            return [];
        }

        // Get the raw value first to check for potential corruption
        const rawTriggerWords = config.getDataValue('triggerWords');
        
        // Ensure triggerWords is always an array
        const words = Array.isArray(rawTriggerWords) 
            ? rawTriggerWords.filter(word => word && typeof word === 'string') 
            : [];
        
        return words;
    } catch (error) {
        console.error(`Error fetching trigger words for guild ${guildId}:`, error);
        return [];
    }
}

/**
 * Special function for profile command that directly queries the database
 */
async function getTriggerWordsForProfile(guildId) {
    try {
        // First try the normal way
        const words = await getTriggerWords(guildId);
        if (words && words.length > 0) {
            return words;
        }
        
        // If that fails, try a direct SQL query
        const result = await sequelize.query(
            `SELECT "triggerWords" FROM "GuildConfigs" WHERE "guildId" = :guildId`,
            {
                replacements: { guildId },
                type: sequelize.QueryTypes.SELECT,
                raw: true
            }
        );
        
        if (result && result.length > 0 && result[0].triggerWords) {
            const words = result[0].triggerWords;
            return Array.isArray(words) ? words : [];
        }
        
        // If still nothing, check if there are any streaks with trigger words
        const streakWords = await sequelize.query(
            `SELECT DISTINCT "triggerWord" FROM "Streaks" WHERE "guildId" = :guildId`,
            {
                replacements: { guildId },
                type: sequelize.QueryTypes.SELECT,
                raw: true
            }
        );
        
        if (streakWords && streakWords.length > 0) {
            const words = streakWords.map(w => w.triggerWord);
            
            // Save these words back to the guild config
            try {
                await GuildConfig.upsert({
                    guildId,
                    triggerWords: words
                });
            } catch (saveError) {
                console.error(`Error saving recovered trigger words:`, saveError);
                // Continue even if save fails
            }
            
            return words;
        }
        
        // If we still couldn't find anything, return empty array
        return [];
    } catch (error) {
        console.error(`Error in getTriggerWordsForProfile for guild ${guildId}:`, error);
        return [];
    }
}

/**
 * Check if a word is a valid trigger word for a guild
 */
async function isValidTriggerWord(guildId, word) {
    if (!word) return false;
    
    const lowerWord = word.toLowerCase().trim();
    const triggerWords = await getTriggerWords(guildId);
    
    return triggerWords.some(tw => tw.toLowerCase() === lowerWord);
}

module.exports = {
    setTriggerWords,
    getTriggerWords,
    getTriggerWordsForProfile,
    isValidTriggerWord
}; 