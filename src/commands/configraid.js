const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configraid')
        .setDescription('Configure raid settings for the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Enable or disable raid feature')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('maxsteal')
                .setDescription('Maximum percentage of streaks that can be stolen (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('risk')
                .setDescription('Percentage of streaks risked when raid fails (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('successchance')
                .setDescription('Chance of successful raid (1-100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('cooldown')
                .setDescription('Hours between raids (1-168)')
                .setMinValue(1)
                .setMaxValue(168)
                .setRequired(false)),

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

            // Get current raid configuration
            const currentConfig = await streakManager.getRaidConfig(interaction.guildId);

            // Create new config object with current values
            const newConfig = { ...currentConfig };

            // Update config based on provided options
            const enabled = interaction.options.getBoolean('enabled');
            const maxSteal = interaction.options.getInteger('maxsteal');
            const risk = interaction.options.getInteger('risk');
            const successChance = interaction.options.getInteger('successchance');
            const cooldown = interaction.options.getInteger('cooldown');

            if (enabled !== null) newConfig.enabled = enabled;
            if (maxSteal !== null) newConfig.maxStealPercent = maxSteal;
            if (risk !== null) newConfig.riskPercent = risk;
            if (successChance !== null) newConfig.successChance = successChance;
            if (cooldown !== null) newConfig.cooldownHours = cooldown;

            // Save new configuration
            await streakManager.setRaidConfig(interaction.guildId, newConfig);

            // Create response message
            const status = newConfig.enabled ? '✅ Enabled' : '❌ Disabled';
            const message = `**Raid Configuration Updated**\n\n` +
                `Status: ${status}\n` +
                `Max Steal: ${newConfig.maxStealPercent}%\n` +
                `Risk: ${newConfig.riskPercent}%\n` +
                `Success Chance: ${newConfig.successChance}%\n` +
                `Cooldown: ${newConfig.cooldownHours} hours`;

            await interaction.editReply(message);

        } catch (error) {
            console.error('Error in configraid command:', error);
            const errorMessage = error.message || 'An error occurred while updating raid configuration.';
            
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