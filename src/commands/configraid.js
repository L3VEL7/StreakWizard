const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const streakManager = require('../storage/streakManager');

// Rate limiting map
const configChangeCooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('configraid')
        .setDescription('Configure raid settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Enable or disable the raid system')
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
                .setDescription('Hours between raids (1-24)')
                .setMinValue(1)
                .setMaxValue(24)
                .setRequired(false)),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        const enabled = interaction.options.getBoolean('enabled');
        const maxSteal = interaction.options.getInteger('maxsteal');
        const risk = interaction.options.getInteger('risk');
        const successChance = interaction.options.getInteger('successchance');
        const cooldown = interaction.options.getInteger('cooldown');

        if (!enabled && !maxSteal && !risk && !successChance && !cooldown) {
            return await interaction.reply({
                content: '❌ Please provide at least one setting to configure.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const currentConfig = await streakManager.getRaidConfig(interaction.guildId);
            const newConfig = {
                enabled: enabled !== null ? enabled : currentConfig.enabled,
                maxStealPercent: maxSteal || currentConfig.maxStealPercent,
                riskPercent: risk || currentConfig.riskPercent,
                successChance: successChance || currentConfig.successChance,
                cooldownHours: cooldown || currentConfig.cooldownHours
            };

            await streakManager.updateRaidConfig(interaction.guildId, newConfig);

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('⚔️ Raid System Configuration')
                .setDescription('Raid settings have been updated.')
                .addFields(
                    { name: 'Current Settings', value: 
                        `• Status: ${newConfig.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                        `• Max Steal: ${newConfig.maxStealPercent}%\n` +
                        `• Risk: ${newConfig.riskPercent}%\n` +
                        `• Success Chance: ${newConfig.successChance}%\n` +
                        `• Cooldown: ${newConfig.cooldownHours}h`
                    }
                )
                .setTimestamp();

            await interaction.editReply({
                embeds: [embed],
                ephemeral: true
            });
        } catch (error) {
            console.error('Error updating raid config:', error);
            await interaction.editReply({
                content: '❌ An error occurred while updating the raid configuration.',
                ephemeral: true
            });
        }
    },
}; 