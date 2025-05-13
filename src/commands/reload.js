const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reloads a command')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('command')
                .setDescription('The command to reload')
                .setRequired(true)
                .setAutocomplete(true)),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const commands = [];
        const commandsPath = path.join(__dirname);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.name);
            }
        }

        const filtered = commands.filter(command => command.toLowerCase().includes(focusedValue.toLowerCase()));
        await interaction.respond(
            filtered.map(command => ({ name: command, value: command }))
        );
    },

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        const commandName = interaction.options.getString('command', true).toLowerCase();
        const command = interaction.client.commands.get(commandName);

        if (!command) {
            return await interaction.reply({
                content: `❌ There is no command with name \`${commandName}\`!`,
                ephemeral: true
            });
        }

        try {
            // Delete the command from the collection
            delete require.cache[require.resolve(`./${commandName}.js`)];
            interaction.client.commands.delete(command.data.name);

            // Load the command again
            const newCommand = require(`./${commandName}.js`);
            interaction.client.commands.set(newCommand.data.name, newCommand);

            await interaction.reply({
                content: `✅ Command \`${commandName}\` was reloaded!`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error reloading command:', error);
            await interaction.reply({
                content: `❌ There was an error while reloading a command \`${commandName}\`:\n\`${error.message}\``,
                ephemeral: true
            });
        }
    }
}; 