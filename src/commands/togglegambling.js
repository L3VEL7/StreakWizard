/**
 * Toggle Gambling Command
 * 
 * A standalone command to enable or disable the gambling system for the server.
 * This command provides administrators with a quick way to toggle the gambling
 * feature without having to navigate through the setup-embed menus.
 * 
 * When enabled, users can gamble their streaks using the /gamble command.
 * When disabled, the gambling command will be unavailable.
 */
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('togglegambling')
        .setDescription('Enable or disable the gambling system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    /**
     * Execute the togglegambling command
     * Toggles the gambling system on/off and displays the updated configuration
     * 
     * @param {Interaction} interaction - The Discord interaction
     */
    async execute(interaction) {
        // Check for administrator permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Get current gambling configuration
            const currentConfig = await streakManager.getGamblingConfig(interaction.guildId);
            
            // Toggle the enabled status
            const newStatus = !currentConfig.enabled;

            // Update the gambling configuration in the database
            await streakManager.updateGamblingConfig(interaction.guildId, {
                enabled: newStatus,
                successChance: currentConfig.successChance,
                maxGamblePercent: currentConfig.maxGamblePercent,
                minStreaks: currentConfig.minStreaks
            });

            // Create a response with updated status and configuration
            const status = newStatus ? 'enabled' : 'disabled';
            const embed = new EmbedBuilder()
                .setColor(newStatus ? '#00FF00' : '#FF0000')
                .setTitle('🎲 Gambling System Configuration')
                .setDescription(`Gambling system has been ${status}.`)
                .addFields(
                    { name: 'Current Settings', value: 
                        `• Status: ${newStatus ? '✅ Enabled' : '❌ Disabled'}\n` +
                        `• Success Chance: ${currentConfig.successChance}%\n` +
                        `• Max Gamble: ${currentConfig.maxGamblePercent}%\n` +
                        `• Min Streaks: ${currentConfig.minStreaks}`
                    }
                )
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error toggling gambling:', error);
            await interaction.editReply({
                content: '❌ An error occurred while toggling the gambling system.',
                ephemeral: true
            });
        }
    },
}; 