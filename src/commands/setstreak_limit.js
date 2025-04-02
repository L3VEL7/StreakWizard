const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setstreak_limit')
        .setDescription('Set how often users can update their streaks')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addIntegerOption(option =>
            option.setName('hours')
                .setDescription('Hours between streak updates (1-24, will be converted to minutes)')
                .setMinValue(1)
                .setMaxValue(24)
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const hours = interaction.options.getInteger('hours');
            // Convert hours to minutes for storage
            const minutes = hours * 60;
            
            await streakManager.setStreakLimit(interaction.guildId, minutes);
            
            await interaction.editReply({
                content: `✅ Set streak update interval to ${hours} hour${hours !== 1 ? 's' : ''} (${minutes} minutes).`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error setting streak limit:', error);
            await interaction.editReply({
                content: '❌ An error occurred while setting the streak limit.',
                ephemeral: true
            });
        }
    },
};