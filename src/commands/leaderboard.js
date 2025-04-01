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

            // Track a potential error to display at the end
            let hasError = false;

            for (const word of triggerWords) {
                try {
                    let leaderboard = await streakManager.getLeaderboard(interaction.guildId, word);
                    if (leaderboard && leaderboard.length > 0) {
                        // Format entries - top 10 only
                        const leaderboardEntries = leaderboard.slice(0, 10);
                        
                        // Simple formatting with numbers/medals
                        const leaderboardText = leaderboardEntries
                            .map((entry, index) => {
                                let prefix;
                                if (index === 0) prefix = '🥇';
                                else if (index === 1) prefix = '🥈';
                                else if (index === 2) prefix = '🥉';
                                else prefix = `${index + 1}.`;
                                
                                // Use userId directly without trying to fetch username
                                return `${prefix} <@${entry.userId}>: ${entry.count} streaks`;
                            })
                            .join('\n');
                        
                        embed.addFields({ name: `📝 ${word}`, value: leaderboardText || 'No data yet' });
                    } else {
                        embed.addFields({ name: `📝 ${word}`, value: 'No entries yet' });
                    }
                } catch (wordError) {
                    console.error(`Error fetching leaderboard for word "${word}":`, wordError);
                    embed.addFields({ name: `📝 ${word}`, value: '❌ Error loading data' });
                    hasError = true;
                }
            }

            if (hasError) {
                embed.setFooter({ 
                    text: 'Some data could not be loaded. Try /fixleaderboard for a more detailed view.' 
                });
            }

            await interaction.editReply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error showing leaderboard:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fetching the leaderboard. Use /fixleaderboard for a more reliable alternative.',
                ephemeral: true
            });
        }
    },
};
