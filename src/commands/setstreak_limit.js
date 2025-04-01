const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setstreak_limit')
        .setDescription('Set the streak limit for the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('interval')
                .setDescription('The interval for the streak limit (e.g., 1h, 2h, 1d)')
                .setRequired(true)),

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
            await interaction.deferReply({ ephemeral: true });

            const interval = interaction.options.getString('interval');
            const hours = parseInterval(interval);

            if (hours === null) {
                return await interaction.editReply({
                    content: '❌ Invalid interval format. Please use format like "1h", "2h", or "1d".',
                    ephemeral: true
                });
            }

            // Set the streak limit
            await streakManager.setStreakLimit(interaction.guildId, hours);

            // Create success message
            const message = `✅ Successfully set streak limit to ${interval}.\n\n` +
                `Users will now need to wait ${interval} between streak attempts.`;

            await interaction.editReply(message);

        } catch (error) {
            console.error('Error in setstreak_limit command:', error);
            const errorMessage = error.message || 'An error occurred while setting the streak limit.';
            
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

function parseInterval(interval) {
    const match = interval.match(/^(\d+)([hd])$/);
    if (!match) return null;

    const [, amount, unit] = match;
    const hours = parseInt(amount);

    if (unit === 'd') {
        return hours * 24;
    }
    return hours;
}