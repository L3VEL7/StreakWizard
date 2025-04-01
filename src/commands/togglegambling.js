const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('togglegambling')
        .setDescription('Enable or disable the gambling system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const currentConfig = await streakManager.getGamblingConfig(interaction.guildId);
            const newStatus = !currentConfig.enabled;

            await streakManager.updateGamblingConfig(interaction.guildId, {
                enabled: newStatus,
                successChance: currentConfig.successChance,
                maxGamblePercent: currentConfig.maxGamblePercent,
                minStreaks: currentConfig.minStreaks
            });

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