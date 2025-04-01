const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');
const { GuildConfig } = require('../database/models');
const sequelize = require('../database/config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Add a trigger word')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The trigger word to add')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const word = interaction.options.getString('word').toLowerCase();
            
            // First check for potential database corruption
            try {
                // Try direct SQL query to see what's in the database
                const rawResult = await sequelize.query(
                    `SELECT "triggerWords" FROM "GuildConfigs" WHERE "guildId" = :guildId`,
                    {
                        replacements: { guildId: interaction.guildId },
                        type: sequelize.QueryTypes.SELECT,
                        raw: true
                    }
                );
                
                console.log(`[SETUP] Raw SQL result for trigger words:`, JSON.stringify(rawResult));
                
                const config = await GuildConfig.findByPk(interaction.guildId);
                if (config) {
                    const rawValue = config.getDataValue('triggerWords');
                    console.log(`[SETUP] Current trigger words in database:`, typeof rawValue, JSON.stringify(rawValue));
                    
                    // If trigger words is not an array, attempt to fix it
                    if (rawValue && !Array.isArray(rawValue)) {
                        console.log(`[SETUP] Trying to fix corrupted trigger words data`);
                        
                        let fixedWords = [];
                        
                        // If it's a string, try to split it
                        if (typeof rawValue === 'string') {
                            fixedWords = rawValue.split(',')
                                .map(w => w.trim().toLowerCase())
                                .filter(w => w.length > 0);
                            console.log(`[SETUP] Recovered words from string:`, fixedWords);
                        }
                        
                        // Add the new word
                        if (!fixedWords.includes(word)) {
                            fixedWords.push(word);
                        }
                        
                        // Save fixed data
                        await GuildConfig.update(
                            { triggerWords: fixedWords },
                            { where: { guildId: interaction.guildId } }
                        );
                        
                        await interaction.editReply({
                            content: `✅ Fixed database corruption and added "${word}" as a trigger word. Current trigger words: ${fixedWords.join(', ')}`,
                            ephemeral: true
                        });
                        return;
                    }
                }
            } catch (sqlError) {
                console.error(`[SETUP] SQL error checking trigger words:`, sqlError);
            }
            
            // Continue with normal process if no corruption detected
            const triggerWords = await streakManager.getTriggerWords(interaction.guildId);

            if (triggerWords && triggerWords.includes(word)) {
                await interaction.editReply({
                    content: `❌ "${word}" is already a trigger word.`,
                    ephemeral: true
                });
                return;
            }

            const result = await streakManager.addTriggerWord(interaction.guildId, word);
            const currentWords = await streakManager.getTriggerWords(interaction.guildId);
            
            await interaction.editReply({
                content: `✅ Successfully added "${word}" as a trigger word.\nCurrent trigger words: ${currentWords.join(', ')}`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error adding trigger word:', error);
            await interaction.editReply({
                content: '❌ An error occurred while adding the trigger word.',
                ephemeral: true
            });
        }
    },
};