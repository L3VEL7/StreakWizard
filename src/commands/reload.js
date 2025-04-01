const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reloads a command')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('command')
                .setDescription('The command to reload')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const commandName = interaction.options.getString('command', true).toLowerCase();
            const commandPath = path.join(__dirname, `${commandName}.js`);

            if (!fs.existsSync(commandPath)) {
                return await interaction.editReply({
                    content: `❌ Command \`${commandName}\` not found.`,
                    ephemeral: true
                });
            }

            // Delete the command from the collection
            delete require.cache[require.resolve(commandPath)];

            // Reload the command
            const command = require(commandPath);
            interaction.client.commands.set(command.data.name, command);

            await interaction.editReply({
                content: `✅ Command \`${commandName}\` was reloaded!`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error reloading command:', error);
            await interaction.editReply({
                content: `❌ There was an error while reloading command \`${commandName}\`:\n\`\`\`${error.message}\`\`\``,
                ephemeral: true
            });
        }
    }
}; 