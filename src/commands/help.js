const { SlashCommandBuilder, EmbedBuilder, InteractionResponseFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show information about available commands'),

    async execute(interaction) {
        await interaction.deferReply({ flags: [InteractionResponseFlags.Ephemeral] });

        try {
            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📚 Streakwiz Commands')
                .setDescription('Here are all the available commands:')
                .addFields(
                    { name: '👤 User Commands', value: '`/profile` - View your streak profile\n`/leaderboard` - View server rankings\n`/stats` - View server statistics\n`/gamble` - Gamble your streaks\n`/raid` - Raid other users\' streaks' },
                    { name: '⚙️ Admin Commands', value: '`/setup` - Configure trigger words\n`/setup-embed` - Interactive configuration panel\n`/setstreak_limit` - Set streak update interval\n`/remove` - Remove trigger words\n`/reset` - Reset user streaks\n`/restart` - Restart the bot\n`/reload` - Reload commands\n`/refresh` - Refresh command data\n`/toggle_streakstreak` - Toggle streak streak feature\n`/togglegambling` - Toggle gambling feature\n`/configraid` - Configure raid settings' }
                )
                .setFooter({ text: 'Use /help <command> for detailed information about a specific command' });

            await interaction.editReply({ embeds: [embed], flags: [InteractionResponseFlags.Ephemeral] });
        } catch (error) {
            console.error('Error in help command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fetching help information.',
                flags: [InteractionResponseFlags.Ephemeral]
            });
        }
    },
};
