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

            for (const word of triggerWords) {
                const stats = await streakManager.getStats(interaction.guildId, word);
                if (stats) {
                    embed.addFields({
                        name: `📝 ${word}`,
                        value: `Total Streaks: ${stats.total}\nActive Users: ${stats.users}\nAverage Streak: ${stats.average.toFixed(1)}`
                    });
                }
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