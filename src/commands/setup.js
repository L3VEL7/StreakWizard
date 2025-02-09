const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Configure trigger words for streak tracking')
        .addStringOption(option =>
            option.setName('words')
                .setDescription('Comma-separated list of trigger words')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: 'You need administrator permissions to use this command.',
                    ephemeral: true
                });
            }

            const wordsInput = interaction.options.getString('words');
            // Split by comma and handle potential whitespace, filter out empty strings
            const words = wordsInput.split(',')
                .map(word => word.trim().toLowerCase())
                .filter(word => word.length > 0 && word.length <= 100); // Add length limit

            if (words.length === 0) {
                return interaction.reply({
                    content: 'Please provide at least one valid trigger word.',
                    ephemeral: true
                });
            }

            if (words.length > 50) { // Add reasonable limit to number of trigger words
                return interaction.reply({
                    content: 'Too many trigger words. Please limit to 50 words maximum.',
                    ephemeral: true
                });
            }

            try {
                console.log('Setting up trigger words:', words); // Debug log
                await streakManager.setTriggerWords(interaction.guildId, words);

                await interaction.reply({
                    content: `✅ Streak tracking configured for the following words:\n${words.map(w => `• ${w}`).join('\n')}`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('Error setting up trigger words:', error);
                await interaction.reply({
                    content: 'An error occurred while setting up trigger words. Please try again.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Unexpected error in setup command:', error);
            await interaction.reply({
                content: 'An unexpected error occurred. Please try again.',
                ephemeral: true
            });
        }
    },
};