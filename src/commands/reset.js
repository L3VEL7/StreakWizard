const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Reset streaks for a user or trigger word')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Reset all streaks for a specific user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to reset streaks for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('trigger')
                .setDescription('Reset all user streaks for a specific trigger word')
                .addStringOption(option =>
                    option.setName('trigger')
                        .setDescription('The trigger word to reset streaks for')
                        .setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        try {
            if (subcommand === 'user') {
                const user = interaction.options.getUser('user');
                await streakManager.resetUserStreaks(guildId, user.id);
                await interaction.editReply({
                    content: `✅ Successfully reset all streaks for ${user.username}!`,
                    ephemeral: true
                });
            } else if (subcommand === 'trigger') {
                const trigger = interaction.options.getString('trigger');
                await streakManager.resetTriggerStreaks(guildId, trigger);
                await interaction.editReply({
                    content: `✅ Successfully reset all streaks for trigger word "${trigger}"!`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error resetting streaks:', error);
            await interaction.editReply({
                content: 'There was an error resetting the streaks!',
                ephemeral: true
            });
        }
    },
}; 