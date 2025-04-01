/**
 * Gamble Command
 * 
 * Allows users to gamble their streaks for a chance to win more.
 * Users specify the trigger word and the amount of streaks they want to gamble.
 * This command only works if the gambling system is enabled in the server.
 * The success chance and other parameters can be configured by administrators.
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('Gamble your streaks for a chance to win more')
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The trigger word to gamble')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of streaks to gamble')
                .setRequired(true)),

    /**
     * Execute the gamble command
     * Allows users to gamble their streaks with a chance to win or lose
     * 
     * @param {Interaction} interaction - The Discord interaction
     */
    async execute(interaction) {
        const word = interaction.options.getString('word').toLowerCase();
        const amount = interaction.options.getInteger('amount');

        // Validate that the amount is positive
        if (amount <= 0) {
            return await interaction.reply({
                content: '❌ Please enter a positive number of streaks to gamble.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Check if gambling is enabled in this server
            const isGamblingEnabled = await streakManager.isGamblingEnabled(interaction.guildId);
            if (!isGamblingEnabled) {
                await interaction.editReply({
                    content: '❌ Gambling is currently disabled in this server.',
                    ephemeral: true
                });
                return;
            }

            // Fetch user's streaks and verify they have enough to gamble
            const userStreaks = await streakManager.getUserStreaks(interaction.guildId, interaction.user.id);
            const userStreak = userStreaks.find(s => s.trigger === word);
            const currentStreak = userStreak ? userStreak.count : 0;

            if (!currentStreak || currentStreak < amount) {
                await interaction.editReply({
                    content: `❌ You don't have enough streaks for "${word}". You have ${currentStreak || 0} streaks.`,
                    ephemeral: true
                });
                return;
            }

            // Calculate percentage and perform the gamble operation
            const result = await streakManager.gambleStreak(
                interaction.guildId, 
                interaction.user.id, 
                word, 
                (amount / currentStreak) * 100, // Convert absolute amount to percentage
                'heads' // Default choice for simplicity
            );
            
            // Display the gamble result to the user
            if (result.won) {
                await interaction.editReply({
                    content: `🎉 Congratulations! You won ${result.gambleAmount} streaks!\nYour new streak for "${word}" is ${result.newCount}!`,
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: `😢 Sorry, you lost ${amount} streaks.\nYour new streak for "${word}" is ${result.newCount}.`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in gamble command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing your gamble.',
                ephemeral: true
            });
        }
    },
};
