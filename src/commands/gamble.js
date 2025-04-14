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

        await interaction.deferReply({ ephemeral: false });

        try {
            // Check if gambling is enabled in this server
            const isGamblingEnabled = await streakManager.isGamblingEnabled(interaction.guildId);
            if (!isGamblingEnabled) {
                await interaction.editReply({
                    content: '❌ Gambling is currently disabled in this server.',
                    ephemeral: false
                });
                return;
            }

            // Fetch user's streaks and verify they have enough to gamble
            const userStreaks = await streakManager.getUserStreaksForGambling(interaction.guildId, interaction.user.id);
            const userStreak = userStreaks.find(s => s.trigger === word);
            const currentStreak = userStreak ? userStreak.count : 0;

            if (!currentStreak || currentStreak < amount) {
                await interaction.editReply({
                    content: `❌ You don't have enough streaks for "${word}". You have ${currentStreak || 0} streaks.`,
                    ephemeral: false
                });
                return;
            }

            // Calculate percentage and perform the gamble operation
            // Ensure we have an integer amount and proper percentage calculation
            const exactPercentage = Math.max(1, (amount / currentStreak) * 100);
            console.log(`Gambling ${amount} of ${currentStreak} streaks (${exactPercentage}%)`);
            
            const result = await streakManager.gambleStreak(
                interaction.guildId, 
                interaction.user.id, 
                word, 
                exactPercentage,
                'double' // Changed from 'heads' to 'double' to match expected values in gambleStreak
            );
            
            // Display the gamble result publicly
            if (!result.success) {
                // There was an error with the gamble function
                await interaction.editReply({
                    content: `❌ Error: ${result.message}`,
                    ephemeral: false
                });
                return;
            }

            // Create a detailed embed for the gamble result
            const embed = new EmbedBuilder()
                .setTitle(result.result ? '🎉 Gambling Success!' : '😢 Gambling Failed')
                .setColor(result.result ? '#00FF00' : '#FF0000')
                .setDescription(`${interaction.user} ${result.result ? 'won' : 'lost'} streaks on "${word}".`)
                .addFields(
                    { name: 'Starting Streak', value: `${result.oldStreak}`, inline: true },
                    { name: 'New Streak', value: `${result.newStreak}`, inline: true },
                    { name: 'Change', value: `${result.result ? '+' : '-'}${Math.abs(result.difference)}`, inline: true },
                    { name: 'Gamble Details', value: `${result.percentageUsed}% of streaks (${result.gambleAmount} streaks)` },
                    { name: 'Result', value: `🎲 Roll: ${Math.floor(result.roll)}/100\n⚖️ Success Chance: ${result.successChance}%` }
                )
                .setTimestamp();

            await interaction.editReply({
                content: null,
                embeds: [embed],
                ephemeral: false
            });
        } catch (error) {
            console.error('Error in gamble command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing your gamble.',
                ephemeral: false
            });
        }
    },
};
