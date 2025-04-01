const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('raid')
        .setDescription('Attempt to steal streaks from another user')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user to raid')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('word')
                .setDescription('The trigger word to raid')
                .setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const word = interaction.options.getString('word').toLowerCase();

        if (target.id === interaction.user.id) {
            return await interaction.reply({
                content: '❌ You cannot raid yourself!',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Check if raid system is enabled
            const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
            if (!raidConfig || !raidConfig.enabled) {
                await interaction.editReply({
                    content: '❌ The raid system is currently disabled in this server.',
                    ephemeral: true
                });
                return;
            }

            // Check if user has enough streaks to raid
            const userStreaks = await streakManager.getUserStreaks(interaction.guildId, interaction.user.id);
            const userStreak = userStreaks.find(s => s.trigger === word);
            if (!userStreak || userStreak.count < 2) {
                await interaction.editReply({
                    content: '❌ You need at least 2 streaks to raid.',
                    ephemeral: true
                });
                return;
            }

            // Check if target has enough streaks to be raided
            const targetStreaks = await streakManager.getUserStreaks(interaction.guildId, target.id);
            const targetStreak = targetStreaks.find(s => s.trigger === word);
            if (!targetStreak || targetStreak.count < 2) {
                await interaction.editReply({
                    content: `${target.username} doesn't have enough streaks to raid.`,
                    ephemeral: true
                });
                return;
            }

            // Perform the raid
            const result = await streakManager.raidStreak(
                interaction.guildId,
                interaction.user.id,
                target.id,
                word
            );

            if (result.success) {
                await interaction.editReply({
                    content: `🎉 Raid successful! You stole ${result.stolenAmount} streaks from ${target.username}!\nYour new streak: ${result.newStreak}`,
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: `💀 Raid failed! You lost ${result.lostAmount} streaks.\nYour new streak: ${result.newStreak}`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in raid command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing your raid.',
                ephemeral: true
            });
        }
    },
}; 