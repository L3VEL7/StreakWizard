const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a trigger word from streak tracking')
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
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

            // Defer reply since this might take a moment
            await interaction.deferReply();

            const word = interaction.options.getString('word').trim().toLowerCase();

            // Validate input
            if (!word || word.trim().length === 0) {
                return await interaction.editReply({
                    content: '❌ Please provide a valid trigger word.',
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

            // Check if word exists
            if (!await streakManager.isValidTriggerWord(interaction.guildId, word)) {
                return await interaction.editReply({
                    content: '❌ This trigger word does not exist in this server.',
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

            // Remove the trigger word
            await streakManager.removeTriggerWord(interaction.guildId, word);

            // Create response message
            const message = `✅ Successfully removed the trigger word "${word}"!\n\n` +
                `Note: All streaks associated with this word have been preserved.`;

            await interaction.editReply(message);

        } catch (error) {
            console.error('Error in remove command:', error);
            const errorMessage = error.message || 'An error occurred while removing the trigger word.';
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ ${errorMessage}`,
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            } else {
                await interaction.reply({
                    content: `❌ ${errorMessage}`,
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }
        }
    }
};
