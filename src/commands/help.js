const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show information about available commands'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📚 Bot Commands')
                .setDescription('Here are all the available commands:')
                .addFields(
                    { name: '🎯 Core Commands', value: 
                        '`/profile` - View your streak profile\n' +
                        '`/stats` - View your streak statistics\n' +
                        '`/leaderboard` - View the server\'s streak leaderboard'
                    },
                    { name: '⚔️ Raid System', value: 
                        '`/raid` - Attempt to steal streaks from another user\n' +
                        '`/configraid` - Configure raid settings (Admin only)'
                    },
                    { name: '🎲 Gambling System', value: 
                        '`/gamble` - Gamble your streaks for a chance to win more\n' +
                        '`/togglegambling` - Enable/disable gambling (Admin only)'
                    },
                    { name: '⚙️ Admin Commands', value: 
                        '`/setup` - Add a new trigger word\n' +
                        '`/setup-embed` - Open the interactive configuration panel\n' +
                        '`/reset` - Reset a user\'s streaks\n' +
                        '`/restart` - Restart the bot\n' +
                        '`/toggle_streakstreak` - Enable/disable streak streak tracking'
                    }
                )
                .setFooter({ text: 'Use /help <command> for more details about a specific command' })
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error showing help:', error);
            await interaction.editReply({
                content: '❌ An error occurred while showing the help menu.',
                ephemeral: true
            });
        }
    },
};
