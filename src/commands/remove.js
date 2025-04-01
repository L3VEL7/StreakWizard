const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a trigger word from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The trigger word to remove')
                .setRequired(true)),

    async execute(interaction) {
        try {
            // Check if user has administrator permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.reply({
                    content: '❌ You need administrator permissions to use this command.',
                    ephemeral: true
                });
            }

            // Defer reply since this might take a moment
            await interaction.deferReply({ ephemeral: true });

            const word = interaction.options.getString('word').trim().toLowerCase();

            // Validate input
            if (!word || word.trim().length === 0) {
                return await interaction.editReply({
                    content: '❌ Please provide a valid trigger word.',
                    ephemeral: true
                });
            }

            // Check if the word exists
            const triggerWords = await streakManager.getTriggerWords(interaction.guildId);
            if (!triggerWords.includes(word)) {
                return await interaction.editReply({
                    content: '❌ This trigger word does not exist in this server.',
                    ephemeral: true
                });
            }

            // Remove the trigger word
            await streakManager.removeTriggerWord(interaction.guildId, word);

            // Create success message
            const message = `✅ Successfully removed trigger word: \`${word}\`\n\n` +
                `Note: This will not affect existing streaks. Users will no longer be able to use this word to get new streaks.`;

            await interaction.editReply(message);

        } catch (error) {
            console.error('Error in remove command:', error);
            const errorMessage = error.message || 'An error occurred while removing the trigger word.';
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ ${errorMessage}`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `❌ ${errorMessage}`,
                    ephemeral: true
                });
            }
        }
    }
};
