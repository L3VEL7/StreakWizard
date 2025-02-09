const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows bot commands and usage'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🔥 Streak Bot Help')
            .addFields(
                { name: '/setup', value: 'Configure trigger words (Admin only)\nUsage: `/setup words:word1,word2,word3`' },
                { name: '/setstreak_limit', value: 'Set time between streak updates (Admin only)\nUsage: `/setstreak_limit interval:[hourly/daily/none]`' },
                { name: '/leaderboard', value: 'View streak leaderboard for a specific word\nUsage: `/leaderboard word:trigger_word`' },
                { name: '/help', value: 'Show this help message\nUsage: `/help`' }
            )
            .setFooter({ text: 'Start tracking your streaks today!' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};