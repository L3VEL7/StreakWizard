const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('togglegambling')
        .setDescription('Enable or disable gambling in the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            // Check if user has administrator permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.reply({
                    content: '❌ You need administrator permissions to use this command.',
                    ephemeral: true
                });
            }

            // Defer reply since this might take a moment
            await interaction.deferReply();

            // Get current gambling status
            const currentStatus = await streakManager.isGamblingEnabled(interaction.guildId);
            
            // Toggle the status
            await streakManager.setGamblingEnabled(interaction.guildId, !currentStatus);

            // Create response message
            const newStatus = !currentStatus;
            const statusEmoji = newStatus ? '🎲' : '🚫';
            const statusText = newStatus ? 'enabled' : 'disabled';
            
            await interaction.editReply({
                content: `${statusEmoji} Gambling has been ${statusText} in this server.\n` +
                    `**Note:** Users will need at least 2 streaks to gamble.`
            });

        } catch (error) {
            console.error('Error in togglegambling command:', error);
            const errorMessage = error.message || 'An error occurred while toggling gambling.';
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ ${errorMessage}`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `❌ ${errorMessage}`,
                    ephemeral: true
                });
            }
        }
    }
}; 