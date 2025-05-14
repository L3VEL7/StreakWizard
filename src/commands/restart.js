const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restart')
        .setDescription('Restart the bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Check permissions
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        try {
            // Send confirmation message
            await interaction.reply({
                content: '🔄 Restarting bot...',
                ephemeral: true
            });
            
            // Log the restart event
            console.log(`Bot restart initiated by ${interaction.user.tag} (${interaction.user.id})`);
            
            // Simple delay to allow the message to be sent
            setTimeout(() => {
                console.log('Executing process.exit(0) for restart');
                process.exit(0); // This will trigger the PM2/Railway restart
            }, 1500);
        } catch (error) {
            // Handle any errors during the restart process
            console.error('Error during restart process:', error);
            
            try {
                // Try to notify the user about the error
                if (interaction.replied) {
                    await interaction.followUp({
                        content: `❌ An error occurred during restart: ${error.message}`,
                        ephemeral: true
                    });
                } else {
                    await interaction.reply({
                        content: `❌ An error occurred during restart: ${error.message}`,
                        ephemeral: true
                    });
                }
            } catch (followUpError) {
                // If even the error notification fails, just log it
                console.error('Could not send error message:', followUpError);
            }
        }
    },
}; 