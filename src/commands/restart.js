const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
// Try to import sequelize, but don't fail if it doesn't exist
let sequelize;
try {
    const models = require('../database/models');
    sequelize = models.sequelize;
} catch (error) {
    console.warn('Could not import sequelize models:', error.message);
}

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

        await interaction.reply({
            content: '🔄 Restarting bot...',
            ephemeral: true
        });

        try {
            // Close database connection if available
            if (sequelize) {
                try {
                    await sequelize.close();
                    console.log('Database connection closed');
                } catch (dbError) {
                    console.error('Error closing database connection:', dbError);
                }
            }

            // Make sure to wait a moment for the reply to be sent before exiting
            setTimeout(() => {
                console.log('Bot restart initiated by admin command');
                process.exit(0); // This will trigger the PM2 restart
            }, 1000);
        } catch (error) {
            console.error('Error during restart:', error);
            await interaction.followUp({
                content: '❌ An error occurred while restarting the bot.',
                ephemeral: true
            });
        }
    },
}; 