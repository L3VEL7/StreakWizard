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
                {
                    name: 'Admin Commands',
                    value: [
                        '`/setup` - Configure trigger words',
                        '`/setstreak_limit` - Set time between streak updates',
                        '`/remove` - Remove trigger words',
                        '`/reset` - Reset streaks for users or trigger words',
                        '`/toggle_streakstreak` - Enable/disable streak streak feature',
                        '`/restart` - Restart the bot',
                        '`/refresh` - Refresh command cache',
                        '`/reload` - Force reload all commands',
                        '',
                        'Usage examples:',
                        '• `/setup words:word1,word2,word3`',
                        '• `/setstreak_limit interval:[hourly/daily/none]`',
                        '• `/remove words:word1,word2,word3`',
                        '• `/reset user:@user` or `/reset trigger:word`',
                        '• `/toggle_streakstreak`',
                        '• `/restart`',
                        '• `/refresh`',
                        '• `/reload`'
                    ].join('\n')
                },
                {
                    name: 'User Commands',
                    value: [
                        '`/profile` - View your or another user\'s streak profile',
                        '`/leaderboard` - View streak leaderboard for a specific word',
                        '`/stats` - View server-wide streak statistics',
                        '',
                        'Usage examples:',
                        '• `/profile [@user]`',
                        '• `/leaderboard word:trigger_word`',
                        '• `/stats`'
                    ].join('\n')
                },
                {
                    name: 'General',
                    value: [
                        '`/help` - Show this help message',
                        'Usage: `/help`'
                    ].join('\n')
                }
            )
            .setFooter({ text: 'Start tracking your streaks today!' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}
