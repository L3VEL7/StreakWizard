const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the server\'s streak leaderboard'),

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
                .setTitle('🏆 Streak Leaderboard')
                .setDescription('Top 10 users for each trigger word:')
                .setFooter({ text: `Requested by ${interaction.user.username}` })
                .setTimestamp();

            for (const word of triggerWords) {
                let leaderboard = await streakManager.getLeaderboard(interaction.guildId, word);
                if (leaderboard && leaderboard.length > 0) {
                    // Format entries - top 10 only
                    const leaderboardEntries = leaderboard.slice(0, 10);
                    
                    // Fetch user information for each entry
                    for (const entry of leaderboardEntries) {
                        try {
                            // Try to fetch the user from Discord
                            const user = await interaction.client.users.fetch(entry.userId);
                            if (user) {
                                entry.username = user.username;
                            }
                        } catch (userError) {
                            console.warn(`Could not fetch user ${entry.userId}:`, userError);
                            // Use userId as username if fetch fails
                            entry.username = entry.userId;
                        }
                    }
                    
                    // Simple formatting with numbers/medals
                    const leaderboardText = leaderboardEntries
                        .map((entry, index) => {
                            let prefix;
                            if (index === 0) prefix = '🥇';
                            else if (index === 1) prefix = '🥈';
                            else if (index === 2) prefix = '🥉';
                            else prefix = `${index + 1}.`;
                            
                            return `${prefix} ${entry.username}: ${entry.count} streaks`;
                        })
                        .join('\n');
                    
                    embed.addFields({ name: `📝 ${word}`, value: leaderboardText || 'No data yet' });
                }
            }

            await interaction.editReply({ embeds: [embed], ephemeral: false });
        } catch (error) {
            console.error('Error showing leaderboard:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fetching the leaderboard.',
                ephemeral: false
            });
        }
    },
};
