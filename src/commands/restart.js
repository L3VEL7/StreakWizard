const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');
const streakManager = require('../storage/streakManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restart')
        .setDescription('Restart the bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            // Check if user has administrator permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                await interaction.reply({
                    content: '❌ You need administrator permissions to use this command.',
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }

            // Defer reply since this might take a moment
            await interaction.deferReply();

            // Log the restart attempt
            console.log('=== Bot Restart Initiated ===');
            console.log(`Time: ${new Date().toISOString()}`);
            console.log(`Initiator: ${interaction.user.tag} (${interaction.user.id})`);
            console.log(`Guild: ${interaction.guild.name} (${interaction.guild.id})`);
            console.log(`Channel: ${interaction.channel.name} (${interaction.channel.id})`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log('=============================');

            // Create response message
            const message = '🔄 Restarting the bot...\n' +
                'Please wait a moment while the bot reconnects.';

            await interaction.editReply(message);

            // Wait a moment to ensure the message is sent
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Perform graceful shutdown
            try {
                // Close database connections
                await streakManager.closeConnections();
                
                // Close Discord client connection
                await interaction.client.destroy();
                
                // Exit with custom code to indicate restart
                process.exit(2);
            } catch (error) {
                console.error('Error during graceful shutdown:', error);
                // Force exit if graceful shutdown fails
                process.exit(1);
            }

        } catch (error) {
            console.error('Error in restart command:', error);
            const errorMessage = error.message || 'An error occurred while restarting the bot.';
            
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ ${errorMessage}`,
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            } else {
                await interaction.reply({
                    content: `❌ ${errorMessage}`,
                    flags: [InteractionResponseFlags.Ephemeral]
                });
            }
        }
    }
}; 