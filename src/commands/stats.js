const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View your streak statistics')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to view stats for (defaults to yourself)')
                .setRequired(false)),

    async execute(interaction) {
        try {
            // Defer reply since this might take a moment
            await interaction.deferReply();

            const targetUser = interaction.options.getUser('user') || interaction.user;

            // Get user's streaks
            const userStreaks = await streakManager.getUserStreaks(interaction.guildId, targetUser.id);

            if (!userStreaks || userStreaks.length === 0) {
                return await interaction.editReply({
                    content: `${targetUser} has no streaks yet.`,
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

            // Calculate total streaks and streak streak
            const totalStreaks = userStreaks.reduce((sum, streak) => sum + streak.count, 0);
            const streakStreak = userStreaks.reduce((sum, streak) => sum + (streak.streakStreak || 0), 0);

            // Create response message
            let message = `📊 **Streak Statistics for ${targetUser}**\n\n`;
            message += `**Total Streaks:** ${totalStreaks}\n`;
            message += `**Streak Streak:** ${streakStreak}\n\n`;
            message += `**Individual Streaks:**\n`;

            // Add individual streak information
            for (const streak of userStreaks) {
                message += `• "${streak.trigger}": ${streak.count} (Streak: ${streak.streakStreak || 0})\n`;
            }

            await interaction.editReply(message);

        } catch (error) {
            console.error('Error in stats command:', error);
            const errorMessage = error.message || 'An error occurred while fetching stats.';
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ ${errorMessage}`,
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            } else {
                await interaction.reply({
                    content: `❌ ${errorMessage}`,
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }
        }
    }
}; 