const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggle_streakstreak')
        .setDescription('Enable or disable streak streak tracking')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Whether to enable or disable streak streak tracking')
                .setRequired(true)),

    async execute(interaction) {
        try {
            // Check if user has administrator permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.reply({
                    content: '❌ You need administrator permissions to use this command.',
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

            // Defer reply since this might take a moment
            await interaction.deferReply();

            const enabled = interaction.options.getBoolean('enabled');

            // Update streak streak status
            await streakManager.setStreakStreakEnabled(interaction.guildId, enabled);

            // Create response message
            const status = enabled ? 'enabled' : 'disabled';
            const message = `✅ Streak streak tracking has been ${status}.\n\n` +
                `When enabled, users will get additional streaks for maintaining their daily streaks.`;

            await interaction.editReply(message);

        } catch (error) {
            console.error('Error in toggle_streakstreak command:', error);
            const errorMessage = error.message || 'An error occurred while toggling streak streak tracking.';
            
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