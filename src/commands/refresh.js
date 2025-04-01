const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('refresh')
        .setDescription('Refreshes all commands')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const commands = interaction.client.commands;
            let reloadedCount = 0;

            for (const [name, command] of commands) {
                delete require.cache[require.resolve(`./${name}.js`)];

                try {
                    interaction.client.commands.delete(name);
                    const newCommand = require(`./${name}.js`);
                    interaction.client.commands.set(name, newCommand);
                    reloadedCount++;
                } catch (error) {
                    console.error(`Error reloading command ${name}:`, error);
                    await interaction.editReply({
                        content: `❌ There was an error while reloading command \`${name}\`:\n\`${error.message}\``,
                        ephemeral: true
                    });
                    return;
                }
            }

            await interaction.editReply({
                content: `✅ Successfully reloaded ${reloadedCount} command(s)!`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error in refresh command:', error);
            if (interaction.deferred) {
                await interaction.editReply({
                    content: `❌ An error occurred while refreshing commands: ${error.message}`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `❌ An error occurred while refreshing commands: ${error.message}`,
                    ephemeral: true
                });
            }
        }
    },
}; 