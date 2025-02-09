const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Display streak leaderboard')
        .addStringOption(option =>
            option.setName('word')
                .setDescription('Trigger word to show leaderboard for')
                .setRequired(true)),

    async execute(interaction) {
        const word = interaction.options.getString('word').toLowerCase();
        const guildId = interaction.guildId;

        if (!streakManager.isValidTriggerWord(guildId, word)) {
            return interaction.reply({
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
                    leaderboardText += `${i + 1}. Unknown User: ${streak}\n`;
                }
            }
            embed.addFields({ name: 'Rankings', value: leaderboardText });
        }

        await interaction.reply({ embeds: [embed] });
    },
};
