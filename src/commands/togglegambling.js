const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('togglegambling')
        .setDescription('Enable or disable the gambling feature')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Whether to enable or disable gambling')
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

            // Update gambling status
            await streakManager.setGamblingEnabled(interaction.guildId, enabled);

            // Get current gambling config
            const gamblingConfig = await streakManager.getGamblingConfig(interaction.guildId);

            // Create response message
            const status = enabled ? 'enabled' : 'disabled';
            const message = `✅ Gambling feature has been ${status}.\n\n` +
                `Current gambling settings:\n` +
                `• Success chance: ${gamblingConfig.successChance}%\n` +
                `• Minimum streak requirement: ${gamblingConfig.minStreaks}\n` +
                `• Maximum gamble percentage: ${gamblingConfig.maxGamblePercent}%`;

            await interaction.editReply(message);

        } catch (error) {
            console.error('Error in togglegambling command:', error);
            const errorMessage = error.message || 'An error occurred while toggling gambling.';
            
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