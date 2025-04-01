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
            // Return removed - can cause race conditions after await
                }
            }

            await interaction.editReply({
                content: `✅ Successfully reloaded ${reloadedCount} command(s)!`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error refreshing command data:', error);
            await interaction.editReply({
                content: '❌ An error occurred while refreshing command data.',
                ephemeral: true
            });
        }
    },
}; 