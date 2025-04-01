const { SlashCommandBuilder, EmbedBuilder, InteractionFlags } = require('discord.js');
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
                flags: [InteractionFlags.Ephemeral]
            });
        }

        await interaction.deferReply({ flags: [InteractionFlags.Ephemeral] });

        try {
            // Check if raid system is enabled
            const raidConfig = await streakManager.getRaidConfig(interaction.guildId);
            if (!raidConfig || !raidConfig.enabled) {
                await interaction.editReply({
                    content: '❌ The raid system is currently disabled in this server.',
                    flags: [InteractionFlags.Ephemeral]
                });
                return;
            }

            // Check if user has enough streaks to raid
            const userStreak = await streakManager.getStreak(interaction.guildId, interaction.user.id, word);
            if (!userStreak || userStreak < 2) {
                await interaction.editReply({
                    content: '❌ You need at least 2 streaks to raid.',
                    flags: [InteractionFlags.Ephemeral]
                });
                return;
            }

            // Check if target has enough streaks to be raided
            const targetStreak = await streakManager.getStreak(interaction.guildId, target.id, word);
            if (!targetStreak || targetStreak < 2) {
                await interaction.editReply({
                    content: `${target.username} doesn't have enough streaks to raid.`,
                    flags: [InteractionFlags.Ephemeral]
                });
                return;
            }

            // Perform the raid
            const result = await streakManager.performRaid(
                interaction.guildId,
                interaction.user.id,
                target.id,
                word,
                raidConfig
            );

            if (result.success) {
                await interaction.editReply({
                    content: `🎉 Raid successful! You stole ${result.stolenAmount} streaks from ${target.username}!\nYour new streak: ${result.newStreak}`,
                    flags: [InteractionFlags.Ephemeral]
                });
            } else {
                await interaction.editReply({
                    content: `💀 Raid failed! You lost ${result.lostAmount} streaks.\nYour new streak: ${result.newStreak}`,
                    flags: [InteractionFlags.Ephemeral]
                });
            }
        } catch (error) {
            console.error('Error in raid command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing your raid.',
                flags: [InteractionFlags.Ephemeral]
            });
        }
    },
}; 