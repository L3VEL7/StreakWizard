const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setstreak_limit')
        .setDescription('Set the minimum time between streak updates (Admin only)')
        .addStringOption(option =>
            option.setName('interval')
                .setDescription('Time interval between streaks')
                .setRequired(true)
                .addChoices(
                    { name: 'hourly', value: '60' },
                    { name: 'daily', value: '1440' },
                    { name: 'none', value: '0' }
                ))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: 'You need administrator permissions to use this command.',
                    ephemeral: true
                });
            }

            const minutes = parseInt(interaction.options.getString('interval'));
            await streakManager.setStreakLimit(interaction.guildId, minutes);

            let response;
            if (minutes === 0) {
                response = 'Streak time limit has been removed. Users can update streaks without time restrictions.';
            } else {
                const hours = minutes / 60;
                response = `Streak time limit set to ${hours === 1 ? '1 hour' : `${hours} hours`}. Users must wait this long between streak updates.`;
            }

            await interaction.reply({
                content: response,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error in setstreak_limit command:', error);
            await interaction.reply({
                content: 'An error occurred while setting the streak limit. Please try again.',
                ephemeral: true
            });
        }
    },
};