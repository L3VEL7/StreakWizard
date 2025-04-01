const { SlashCommandBuilder, EmbedBuilder, InteractionResponseFlags } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the server\'s streak leaderboard'),

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
                .setTitle('🏆 Streak Leaderboard')
                .setDescription('Top 10 users for each trigger word:');

            for (const word of triggerWords) {
                const leaderboard = await streakManager.getLeaderboard(interaction.guildId, word);
                if (leaderboard && leaderboard.length > 0) {
                    const leaderboardText = leaderboard
                        .slice(0, 10)
                        .map((entry, index) => {
                            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '•';
                            return `${medal} ${entry.username}: ${entry.count} streaks`;
                        })
                        .join('\n');
                    embed.addFields({ name: `📝 ${word}`, value: leaderboardText || 'No data yet' });
                }
            }

            await interaction.editReply({ embeds: [embed], flags: [InteractionResponseFlags.Ephemeral] });
        } catch (error) {
            console.error('Error showing leaderboard:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fetching the leaderboard.',
                flags: [InteractionResponseFlags.Ephemeral]
            });
        }
    },
};
