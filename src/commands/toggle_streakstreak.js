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

            // Get current status
            const currentStatus = await streakManager.isStreakStreakEnabled(interaction.guildId);

            // If disabling, show warning
            if (!enabled && currentStatus) {
                const warningMessage = '⚠️ **Warning:** Disabling streak streak tracking will:\n' +
                    '• Stop users from getting additional streaks for maintaining daily streaks\n' +
                    '• Not affect existing streak streak counts\n' +
                    '• Allow you to re-enable it later\n\n' +
                    'Are you sure you want to disable streak streak tracking?';

                await interaction.editReply({
                    content: warningMessage,
                    flags: [InteractionResponseFlags.Ephemeral]
                });

                // Wait for confirmation
                const filter = i => i.user.id === interaction.user.id;
                try {
                    const confirmation = await interaction.channel.awaitMessageComponent({
                        filter,
                        time: 30000,
                        componentType: 2 // Button component
                    });

                    if (confirmation.customId === 'confirm') {
                        // Update streak streak status
                        await streakManager.setStreakStreakEnabled(interaction.guildId, enabled);

                        // Create success message
                        const message = `✅ Streak streak tracking has been disabled.\n\n` +
                            `Note: Existing streak streak counts have been preserved.`;

                        await interaction.editReply(message);
                    } else {
                        await interaction.editReply({
                            content: '❌ Operation cancelled.',
                            flags: [InteractionResponseFlags.Ephemeral]
                        });
                    }
                } catch (error) {
                    await interaction.editReply({
                        content: '❌ No confirmation received. Operation cancelled.',
                        flags: [InteractionResponseFlags.Ephemeral]
                    });
                }
            } else {
                // Update streak streak status
                await streakManager.setStreakStreakEnabled(interaction.guildId, enabled);

                // Create response message
                const status = enabled ? 'enabled' : 'disabled';
                const message = `✅ Streak streak tracking has been ${status}.\n\n` +
                    `When enabled, users will get additional streaks for maintaining their daily streaks.`;

                await interaction.editReply(message);
            }

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