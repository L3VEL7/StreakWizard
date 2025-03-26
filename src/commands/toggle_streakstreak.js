const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { GuildConfig } = require('../database/models');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggle_streakstreak')
        .setDescription('Enable or disable the streak streak feature')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const config = await GuildConfig.findByPk(interaction.guildId);
            const currentState = config ? config.streakStreakEnabled : true;
            const newState = !currentState;

            await GuildConfig.upsert({
                guildId: interaction.guildId,
                streakStreakEnabled: newState
            });

            await interaction.editReply({
                content: `✅ Streak streak feature has been ${newState ? 'enabled' : 'disabled'} for this server.`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error toggling streak streak:', error);
            await interaction.editReply({
                content: 'There was an error toggling the streak streak feature!',
                ephemeral: true
            });
        }
    },
}; 