const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');
const streakManager = require('../storage/streakManager');

// Rate limiting map
const configChangeCooldowns = new Map();

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
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

            // Rate limiting check
            const now = Date.now();
            const lastChange = configChangeCooldowns.get(interaction.guildId) || 0;
            const cooldownPeriod = 5 * 60 * 1000; // 5 minutes

            if (now - lastChange < cooldownPeriod) {
                const remainingTime = Math.ceil((cooldownPeriod - (now - lastChange)) / 1000 / 60);
                return await interaction.reply({
                    content: `❌ Please wait ${remainingTime} minute${remainingTime !== 1 ? 's' : ''} before changing raid configuration again.`,
                    flags: [InteractionResponseFlags.Ephemeral]
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

            // Validate configuration changes
            if (maxSteal !== null && risk !== null && maxSteal > risk) {
                throw new Error('Maximum steal percentage cannot be higher than risk percentage');
            }

            if (successChance !== null && (successChance < 1 || successChance > 100)) {
                throw new Error('Success chance must be between 1 and 100');
            }

            // Update configuration
            if (enabled !== null) newConfig.enabled = enabled;
            if (maxSteal !== null) newConfig.maxStealPercent = maxSteal;
            if (risk !== null) newConfig.riskPercent = risk;
            if (successChance !== null) newConfig.successChance = successChance;
            if (cooldown !== null) newConfig.cooldownHours = cooldown;

            // Save new configuration
            await streakManager.setRaidConfig(interaction.guildId, newConfig);

            // Update rate limit timestamp
            configChangeCooldowns.set(interaction.guildId, now);

            // Create response message with emojis for better visibility
            const status = newConfig.enabled ? '✅ Enabled' : '❌ Disabled';
            const message = `**⚔️ Raid Configuration Updated ⚔️**\n\n` +
                `**Status:** ${status}\n` +
                `**Max Steal:** ${newConfig.maxStealPercent}% 💰\n` +
                `**Risk:** ${newConfig.riskPercent}% ⚠️\n` +
                `**Success Chance:** ${newConfig.successChance}% 🎯\n` +
                `**Cooldown:** ${newConfig.cooldownHours} hours ⏰\n\n` +
                `**Note:** Users need at least 2 streaks to raid.`;

            await interaction.editReply(message);

        } catch (error) {
            console.error('Error in configraid command:', error);
            const errorMessage = error.message || 'An error occurred while updating raid configuration.';
            
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