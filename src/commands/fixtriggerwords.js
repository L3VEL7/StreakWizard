const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { GuildConfig, Streak } = require('../database/models');
const sequelize = require('../database/config');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fixtriggerwords')
        .setDescription('Fix trigger word database issues')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // First show current state
            const config = await GuildConfig.findByPk(interaction.guildId);
            const rawValue = config ? config.getDataValue('triggerWords') : null;
            
            let message = '';
            
            if (rawValue === null) {
                message += '⚠️ No trigger words configuration found.\n';
            } else if (!Array.isArray(rawValue)) {
                message += `⚠️ Trigger words corrupted! Current value: ${JSON.stringify(rawValue)}\n`;
            } else {
                message += `ℹ️ Current trigger words: ${rawValue.join(', ')}\n`;
            }
            
            // Try to find trigger words from existing streaks
            try {
                const streakWords = await sequelize.query(
                    `SELECT DISTINCT "triggerWord" FROM "Streaks" WHERE "guildId" = :guildId`,
                    {
                        replacements: { guildId: interaction.guildId },
                        type: sequelize.QueryTypes.SELECT,
                        raw: true
                    }
                );
                
                if (streakWords && streakWords.length > 0) {
                    const words = streakWords.map(w => w.triggerWord);
                    message += `🔍 Found ${words.length} trigger words in streaks: ${words.join(', ')}\n`;
                    
                    // Check if there's data mismatch
                    if (!rawValue || !Array.isArray(rawValue) || words.some(w => !rawValue.includes(w))) {
                        message += '⚙️ Attempting to fix database...\n';
                        
                        // Combine existing words (if valid) with streak words
                        let combinedWords = words;
                        if (Array.isArray(rawValue)) {
                            combinedWords = [...new Set([...rawValue, ...words])];
                        }
                        
                        // Update the database
                        await GuildConfig.upsert({
                            guildId: interaction.guildId,
                            triggerWords: combinedWords
                        });
                        
                        message += `✅ Fixed! Updated trigger words: ${combinedWords.join(', ')}\n`;
                    } else {
                        message += '✅ No issues detected with trigger words.\n';
                    }
                } else {
                    message += '⚠️ No streaks found with trigger words.\n';
                }
            } catch (error) {
                console.error('Error retrieving streak trigger words:', error);
                message += '❌ Error retrieving streak trigger words.\n';
            }
            
            // Force refresh in the streak manager
            try {
                const refreshedWords = await streakManager.getTriggerWordsForProfile(interaction.guildId);
                message += `🔄 Refreshed trigger words in memory: ${refreshedWords.join(', ')}\n`;
            } catch (refreshError) {
                console.error('Error refreshing trigger words:', refreshError);
                message += '❌ Error refreshing trigger words in memory.\n';
            }
            
            await interaction.editReply({
                content: message || '❌ No trigger word data found or repaired.',
                ephemeral: true
            });
        } catch (error) {
            console.error('Error in fixtriggerwords command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fixing trigger words.',
                ephemeral: true
            });
        }
    },
}; 