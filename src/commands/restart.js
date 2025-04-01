const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restart')
        .setDescription('Restart the bot')
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
            await interaction.editReply({
                content: '🔄 Restarting bot...',
                ephemeral: true
            });

            // Close database connection
            const streakManager = require('../storage/streakManager');
            await streakManager.closeConnection();

            // Close Discord client connection
            process.exit(0); // This will trigger the PM2 restart
        } catch (error) {
            console.error('Error during restart:', error);
            await interaction.editReply({
                content: '❌ An error occurred while restarting the bot.',
                ephemeral: true
            });
        }
    },
}; 