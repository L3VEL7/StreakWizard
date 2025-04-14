const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('refresh')
        .setDescription('Refresh command data')
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
            const commands = interaction.client.commands;
            let reloadedCount = 0;
            let errorCount = 0;
            let errorMessages = [];

            // First update the message to show progress
            await interaction.editReply({
                content: `🔄 Refreshing ${commands.size} commands...`,
                ephemeral: true
            });

            for (const [name, command] of commands) {
                try {
                    delete require.cache[require.resolve(`./${name}.js`)];
                    interaction.client.commands.delete(name);
                    const newCommand = require(`./${name}.js`);
                    interaction.client.commands.set(name, newCommand);
                    reloadedCount++;
                    
                    // Update every few commands to show progress
                    if (reloadedCount % 5 === 0) {
                        await interaction.editReply({
                            content: `🔄 Refreshed ${reloadedCount}/${commands.size} commands...`,
                            ephemeral: true
                        });
                    }
                } catch (error) {
                    console.error(`Error reloading command ${name}:`, error);
                    errorCount++;
                    errorMessages.push(`\`${name}\`: ${error.message}`);
                    // Continue with next command instead of returning
                }
            }

            // Prepare final result message
            let resultMessage = '';
            if (errorCount === 0) {
                resultMessage = `✅ Successfully reloaded all ${reloadedCount} command(s)!`;
            } else {
                resultMessage = `⚠️ Reloaded ${reloadedCount} command(s), but encountered ${errorCount} error(s):\n`;
                // Only show first 3 errors to avoid message length limits
                resultMessage += errorMessages.slice(0, 3).join('\n');
                if (errorMessages.length > 3) {
                    resultMessage += `\n...and ${errorMessages.length - 3} more errors. Check console logs for details.`;
                }
            }

            await interaction.editReply({
                content: resultMessage,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error refreshing command data:', error);
            await interaction.editReply({
                content: '❌ An error occurred while refreshing command data: ' + error.message,
                ephemeral: true
            });
        }
    },
}; 