const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');
const { Streak, GuildConfig } = require('../database/models');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetdata')
        .setDescription('Reset all streaks and trigger words for this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addBooleanOption(option =>
            option.setName('confirm')
                .setDescription('Confirm that you want to reset all data')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        const confirm = interaction.options.getBoolean('confirm');
        if (!confirm) {
            return await interaction.reply({
                content: '⚠️ Please confirm that you want to reset all data by setting the confirm option to true.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // Get current stats before reset
            const triggerWords = await streakManager.getTriggerWords(interaction.guildId);
            const stats = await streakManager.getStats(interaction.guildId);

            // Delete all streaks for this guild
            await Streak.destroy({
                where: {
                    guildId: interaction.guildId
                }
            });

            // Reset trigger words
            await GuildConfig.update(
                { triggerWords: [] },
                { where: { guildId: interaction.guildId } }
            );

            // Create response message
            let response = '✅ Successfully reset all data:\n';
            response += `- Removed ${stats.totalStreaks} total streaks\n`;
            response += `- Reset ${stats.uniqueUsers} users' streaks\n`;
            response += `- Removed ${triggerWords.length} trigger words: ${triggerWords.join(', ')}`;

            await interaction.editReply({
                content: response,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error resetting data:', error);
            await interaction.editReply({
                content: '❌ An error occurred while resetting the data.',
                ephemeral: true
            });
        }
    }
}; 