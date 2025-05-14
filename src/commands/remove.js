const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a trigger word')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The trigger word to remove')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        // Use reply instead of deferReply to avoid timing issues
        try {
            // Get the word parameter directly - with required: true
            const word = interaction.options.getString('word', true);
            
            // Log to help with debugging
            console.log(`Removing trigger word: "${word}" in guild ${interaction.guildId}`);
            
            const lowercaseWord = word.toLowerCase();
            const triggerWords = await streakManager.getTriggerWords(interaction.guildId);
            
            console.log(`Current trigger words: ${JSON.stringify(triggerWords)}`);

            if (!triggerWords || triggerWords.length === 0) {
                return await interaction.reply({
                    content: '❌ No trigger words are configured for this server.',
                    ephemeral: true
                });
            }

            if (!triggerWords.includes(lowercaseWord)) {
                return await interaction.reply({
                    content: `❌ The word "${word}" is not a trigger word.`,
                    ephemeral: true
                });
            }

            await streakManager.removeTriggerWord(interaction.guildId, lowercaseWord);
            
            // Get updated trigger words to confirm removal
            const updatedTriggerWords = await streakManager.getTriggerWords(interaction.guildId);
            console.log(`Updated trigger words: ${JSON.stringify(updatedTriggerWords)}`);
            
            await interaction.reply({
                content: `✅ Successfully removed "${word}" as a trigger word.`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error removing trigger word:', error);
            return await interaction.reply({
                content: `❌ An error occurred while removing the trigger word: ${error.message}`,
                ephemeral: true
            });
        }
    },
};
