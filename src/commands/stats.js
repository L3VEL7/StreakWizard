const { SlashCommandBuilder, EmbedBuilder, InteractionResponseFlags } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View server-wide streak statistics'),

    async execute(interaction) {
        await interaction.deferReply({ flags: [InteractionResponseFlags.Ephemeral] });

        try {
            const triggerWords = await streakManager.getTriggerWords(interaction.guildId);
            if (!triggerWords || triggerWords.length === 0) {
                await interaction.editReply({
                    content: '❌ No trigger words have been set up yet.',
                    flags: [InteractionResponseFlags.Ephemeral]
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📊 Server Statistics')
                .setDescription('Overall streak statistics for this server:');

            for (const word of triggerWords) {
                const stats = await streakManager.getStats(interaction.guildId, word);
                if (stats) {
                    embed.addFields({
                        name: `📝 ${word}`,
                        value: `Total Streaks: ${stats.totalStreaks}\nActive Users: ${stats.activeUsers}\nAverage Streak: ${stats.averageStreak.toFixed(1)}`
                    });
                }
            }

            await interaction.editReply({ embeds: [embed], flags: [InteractionResponseFlags.Ephemeral] });
        } catch (error) {
            console.error('Error showing stats:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fetching statistics.',
                flags: [InteractionResponseFlags.Ephemeral]
            });
        }
    },
}; 