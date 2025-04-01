const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View server-wide streak statistics'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const triggerWords = await streakManager.getTriggerWords(interaction.guildId);
            if (!triggerWords || triggerWords.length === 0) {
                await interaction.editReply({
                    content: '❌ No trigger words have been set up yet.',
                    ephemeral: true
                });
            // Return removed - can cause race conditions after await
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

            await interaction.editReply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error showing stats:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fetching statistics.',
                ephemeral: true
            });
        }
    },
}; 