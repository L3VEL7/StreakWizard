const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restart')
        .setDescription('Restart the bot (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            // Defer the reply since this operation might take a moment
            await interaction.deferReply({ ephemeral: true });

            // Check if the user has administrator permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                await interaction.editReply({
                    content: '❌ You do not have permission to use this command.',
                    ephemeral: true
                });
                return;
            }

            // Send confirmation message
            await interaction.editReply({
                content: '🔄 Restarting the bot...\nThe bot will be back online in a few moments.',
                ephemeral: true
            });

            // Log the restart with detailed information
            console.log('=== Bot Restart Initiated ===');
            console.log(`Time: ${new Date().toISOString()}`);
            console.log(`Initiator: ${interaction.user.tag} (${interaction.user.id})`);
            console.log(`Guild: ${interaction.guild.name} (${interaction.guild.id})`);
            console.log(`Channel: ${interaction.channel.name} (${interaction.channel.id})`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Platform: Railway.app`);
            console.log('=============================');

            // Wait a moment to ensure the message is sent and logs are written
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Exit the process with a custom exit code to indicate a restart
            process.exit(2);
        } catch (error) {
            console.error('Error in restart command:', error);
            try {
                await interaction.editReply({
                    content: '❌ An error occurred while trying to restart the bot.',
                    ephemeral: true
                });
            } catch (replyError) {
                console.error('Failed to send error message:', replyError);
            }
        }
    }
}; 