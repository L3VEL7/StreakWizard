const { SlashCommandBuilder, PermissionFlagsBits, InteractionResponseFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reload a command')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('command')
                .setDescription('The command to reload')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                flags: [InteractionResponseFlags.Ephemeral]
            });
        }

        await interaction.deferReply({ flags: [InteractionResponseFlags.Ephemeral] });

        try {
            const commandName = interaction.options.getString('command').toLowerCase();
            const command = interaction.client.commands.get(commandName);

            if (!command) {
                await interaction.editReply({
                    content: `❌ Command \`${commandName}\` not found.`,
                    flags: [InteractionResponseFlags.Ephemeral]
                });
                return;
            }

            // Reload the command
            delete require.cache[require.resolve(`./${commandName}.js`)];
            interaction.client.commands.delete(commandName);
            const newCommand = require(`./${commandName}.js`);
            interaction.client.commands.set(commandName, newCommand);

            await interaction.editReply({
                content: `✅ Command \`${commandName}\` has been reloaded!`,
                flags: [InteractionResponseFlags.Ephemeral]
            });
        } catch (error) {
            console.error('Error reloading command:', error);
            await interaction.editReply({
                content: `❌ There was an error while reloading command \`${commandName}\`:\n\`${error.message}\``,
                flags: [InteractionResponseFlags.Ephemeral]
            });
        }
    },
}; 