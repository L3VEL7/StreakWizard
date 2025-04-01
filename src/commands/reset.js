const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Reset all streaks for a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to reset streaks for')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        const targetUser = interaction.options.getUser('user');

        try {
            const userStreaks = await streakManager.getUserStreaks(interaction.guildId, targetUser.id);
            
            if (!userStreaks || userStreaks.length === 0) {
                return await interaction.editReply({
                    content: `${targetUser.username} has no streaks to reset.`,
                    ephemeral: true
                });
            }

            await streakManager.resetUserStreaks(interaction.guildId, targetUser.id);
            
            await interaction.editReply({
                content: `✅ Successfully reset all streaks for ${targetUser.username}.`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error resetting user streaks:', error);
            await interaction.editReply({
                content: '❌ An error occurred while resetting the user\'s streaks.',
                ephemeral: true
            });
        }
    },
}; 