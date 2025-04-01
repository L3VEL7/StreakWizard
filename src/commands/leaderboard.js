const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the server\'s streak leaderboard'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const triggerWords = await streakManager.getTriggerWords(interaction.guildId);
            if (!triggerWords || triggerWords.length === 0) {
                await interaction.editReply({
                    content: '❌ No trigger words have been set up yet.',
                    ephemeral: true
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('🏆 Streak Leaderboard')
                .setDescription('Top 10 users for each trigger word:');

            for (const word of triggerWords) {
                let leaderboard = await streakManager.getLeaderboard(interaction.guildId, word);
                if (leaderboard && leaderboard.length > 0) {
                    // Fetch usernames for all users in the leaderboard
                    const leaderboardEntries = leaderboard.slice(0, 10); // Only process top 10
                    
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
                            // Keep userId as username if fetch fails
                        }
                    }
                    
                    const leaderboardText = leaderboardEntries
                        .map((entry, index) => {
                            // Use medals for top 3, numbers for 4-10
                            let prefix;
                            if (index === 0) {
                                prefix = '🥇';
                            } else if (index === 1) {
                                prefix = '🥈';
                            } else if (index === 2) {
                                prefix = '🥉';
                            } else {
                                // Use numbered placings (4., 5., etc.) for ranks 4-10
                                prefix = `${index + 1}.`;
                            }
                            return `${prefix} ${entry.username}: ${entry.count} streaks`;
                        })
                        .join('\n');
                    embed.addFields({ name: `📝 ${word}`, value: leaderboardText || 'No data yet' });
                }
            }

            await interaction.editReply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error showing leaderboard:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fetching the leaderboard.',
                ephemeral: true
            });
        }
    },
};
