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
                { name: 'Admin Commands', value: 
                    '`/setup` - Configure trigger words\n' +
                    '`/setstreak_limit` - Set time between streak updates\n' +
                    '`/remove` - Remove trigger words\n' +
                    '`/reset` - Reset streaks for users or trigger words\n' +
                    '`/toggle_streakstreak` - Enable/disable streak streak feature\n' +
                    'Usage examples:\n' +
                    '• `/setup words:word1,word2,word3`\n' +
                    '• `/setstreak_limit interval:[hourly/daily/none]`\n' +
                    '• `/remove words:word1,word2,word3`\n' +
                    '• `/reset user:@user` or `/reset trigger:word`\n' +
                    '• `/toggle_streakstreak`'
                },
                { name: 'User Commands', value:
                    '`/profile` - View your or another user\'s streak profile\n' +
                    '`/leaderboard` - View streak leaderboard for a specific word\n' +
                    '`/stats` - View server-wide streak statistics\n' +
                    'Usage examples:\n' +
                    '• `/profile [@user]`\n' +
                    '• `/leaderboard word:trigger_word`\n' +
                    '• `/stats`'
                },
                { name: 'General', value:
                    '`/help` - Show this help message\n' +
                    'Usage: `/help`'
                }
            )
            .setFooter({ text: 'Start tracking your streaks today!' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
