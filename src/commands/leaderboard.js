const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Display streak leaderboard')
        .addStringOption(option =>
            option.setName('word')
                .setDescription('Trigger word to show leaderboard for')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages | PermissionFlagsBits.ViewChannel),

    async execute(interaction) {
        try {
            // Defer the reply since this might take a moment
            await interaction.deferReply({ ephemeral: true });

            const word = interaction.options.getString('word').toLowerCase();
            const guildId = interaction.guildId;

            if (!streakManager.isValidTriggerWord(guildId, word)) {
                return interaction.editReply({
                    content: 'Invalid trigger word. Use /setup to configure valid trigger words.',
                    ephemeral: true
                });
            }

            const streaks = await streakManager.getStreaks(guildId, word);
            const userStreaks = streaks[word] || {};
            const sortedStreaks = Object.entries(userStreaks)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 25);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle(`🔥 Streak Leaderboard: "${word}"`)
                .setDescription('Top 25 streaks')
                .setTimestamp();

            if (sortedStreaks.length === 0) {
                embed.addFields({ name: 'No streaks yet!', value: 'Be the first to start a streak!' });
            } else {
                let leaderboardText = '';
                for (let i = 0; i < sortedStreaks.length; i++) {
                    const [userId, streak] = sortedStreaks[i];
                    try {
                        const user = await interaction.client.users.fetch(userId);
                        leaderboardText += `${i + 1}. ${user.username}: ${streak}\n`;
                    } catch (error) {
                        console.warn(`Failed to fetch user ${userId}:`, error);
                        leaderboardText += `${i + 1}. Unknown User: ${streak}\n`;
                    }
                }
                embed.addFields({ name: 'Rankings', value: leaderboardText });
            }

            await interaction.editReply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            console.error('Error in leaderboard command:', error);
            const errorMessage = interaction.replied || interaction.deferred
                ? 'There was an error updating the leaderboard. Please try again later.'
                : 'There was an error displaying the leaderboard. Please try again later.';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({
                    content: errorMessage,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: '❌ An error occurred while fetching the leaderboard.',
                    ephemeral: true
                });
            }
        }
    },
};
