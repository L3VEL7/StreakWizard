const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View server-wide streak statistics'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });

        try {
            const triggerWords = await streakManager.getTriggerWords(interaction.guildId);
            if (!triggerWords || triggerWords.length === 0) {
                await interaction.editReply({
                    content: '❌ No trigger words have been set up yet.',
                    ephemeral: false
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📊 Server Statistics')
                .setDescription('Overall streak statistics for this server:')
                .setFooter({ text: `Requested by ${interaction.user.username}` })
                .setTimestamp();

            let hasStats = false;
            for (const word of triggerWords) {
                const stats = await streakManager.getStats(interaction.guildId, word);
                if (stats && stats.total > 0) {
                    hasStats = true;
                    const average = stats.average || 0;
                    embed.addFields({
                        name: `📝 ${word}`,
                        value: `Total Streaks: ${stats.total}\nActive Users: ${stats.users}\nAverage Streak: ${average.toFixed(1)}`
                    });
                }
            }

            if (!hasStats) {
                embed.setDescription('No streak statistics available yet.');
            }

            await interaction.editReply({ embeds: [embed], ephemeral: false });
        } catch (error) {
            console.error('Error showing stats:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fetching statistics.',
                ephemeral: false
            });
        }
    },
}; 