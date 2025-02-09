
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove trigger words from streak tracking')
        .addStringOption(option =>
            option.setName('words')
                .setDescription('Comma-separated list of trigger words to remove')
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
            const words = wordsInput.split(',')
                .map(word => word.trim())
                .filter(word => word.length > 0);

            if (words.length === 0) {
                return interaction.reply({
                    content: 'Please provide at least one valid trigger word to remove.',
                    ephemeral: true
                });
            }

            try {
                const updatedWords = await streakManager.removeTriggerWords(interaction.guildId, words);
                
                await interaction.reply({
                    content: `✅ Removed the following trigger words:\n${words.map(w => `• ${w}`).join('\n')}\n\nRemaining trigger words:\n${updatedWords.map(w => `• ${w}`).join('\n')}`,
                    ephemeral: true
                });
            } catch (error) {
                console.error('Error removing trigger words:', error);
                await interaction.reply({
                    content: 'An error occurred while removing trigger words. Please try again.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Unexpected error in remove command:', error);
            await interaction.reply({
                content: 'An unexpected error occurred. Please try again.',
                ephemeral: true
            });
        }
    },
};
