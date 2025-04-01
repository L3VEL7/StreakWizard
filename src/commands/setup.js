const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Set up a new trigger word for streaks')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The trigger word to set up (max 100 characters)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('A description of what this trigger word is for (max 500 characters)')
                .setRequired(false)),

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
            const description = (interaction.options.getString('description') || 'No description provided.').trim();

            // Validate input
            if (!word || word.trim().length === 0) {
                return await interaction.editReply({
                    content: '❌ Please provide a valid trigger word.',
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

            // Check word length
            if (word.length > 100) {
                return await interaction.editReply({
                    content: '❌ Trigger word must be 100 characters or less.',
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

            // Check description length
            if (description.length > 500) {
                return await interaction.editReply({
                    content: '❌ Description must be 500 characters or less.',
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

            // Check if word contains only valid characters
            if (!/^[a-z0-9\s-]+$/.test(word)) {
                return await interaction.editReply({
                    content: '❌ Trigger word can only contain letters, numbers, spaces, and hyphens.',
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

            // Check if word already exists
            if (await streakManager.isValidTriggerWord(interaction.guildId, word)) {
                return await interaction.editReply({
                    content: '❌ This trigger word already exists in this server.',
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

            // Add the trigger word
            await streakManager.addTriggerWord(interaction.guildId, word, description);

            // Create response message
            const message = `✅ Successfully set up the trigger word "${word}"!\n` +
                `Description: ${description}\n\n` +
                `Users can now start getting streaks by using this word.`;

            await interaction.editReply(message);

        } catch (error) {
            console.error('Error in setup command:', error);
            const errorMessage = error.message || 'An error occurred while setting up the trigger word.';
            
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