const { SlashCommandBuilder, EmbedBuilder, InteractionFlags } = require('discord.js');
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

    async execute(interaction) {
        const word = interaction.options.getString('word').toLowerCase();
        const amount = interaction.options.getInteger('amount');

        if (amount <= 0) {
            return await interaction.reply({
                content: '❌ Please enter a positive number of streaks to gamble.',
                flags: [InteractionFlags.Ephemeral]
            });
        }

        await interaction.deferReply({ flags: [InteractionFlags.Ephemeral] });

        try {
            // Check if gambling is enabled
            const isGamblingEnabled = await streakManager.isGamblingEnabled(interaction.guildId);
            if (!isGamblingEnabled) {
                await interaction.editReply({
                    content: '❌ Gambling is currently disabled in this server.',
                    flags: [InteractionFlags.Ephemeral]
                });
                return;
            }

            // Check if user has enough streaks
            const currentStreak = await streakManager.getStreak(interaction.guildId, interaction.user.id, word);
            if (!currentStreak || currentStreak < amount) {
                await interaction.editReply({
                    content: `❌ You don't have enough streaks for "${word}". You have ${currentStreak || 0} streaks.`,
                    flags: [InteractionFlags.Ephemeral]
                });
                return;
            }

            // Perform the gamble
            const result = await streakManager.gambleStreaks(interaction.guildId, interaction.user.id, word, amount);
            
            if (result.won) {
                await interaction.editReply({
                    content: `🎉 Congratulations! You won ${result.wonAmount} streaks!\nYour new streak for "${word}" is ${result.newStreak}!`,
                    flags: [InteractionFlags.Ephemeral]
                });
            } else {
                await interaction.editReply({
                    content: `😢 Sorry, you lost ${amount} streaks.\nYour new streak for "${word}" is ${result.newStreak}.`,
                    flags: [InteractionFlags.Ephemeral]
                });
            }
        } catch (error) {
            console.error('Error in gamble command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing your gamble.',
                flags: [InteractionFlags.Ephemeral]
            });
        }
    },
}; 