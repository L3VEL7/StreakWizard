const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Force reload all commands (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            // Check if the user has administrator permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                await interaction.editReply({
                    content: '❌ You need administrator permissions to use this command.',
                    ephemeral: true
                });
                return;
            }

            // Clear the command cache
            interaction.client.commands.clear();

            // Reload all commands
            const commandsPath = path.join(__dirname);
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                try {
                    const filePath = path.join(commandsPath, file);
                    delete require.cache[require.resolve(filePath)];
                    const command = require(filePath);

                    if (!command.data || !command.data.name || !command.execute) {
                        console.warn(`[WARNING] The command at ${file} is missing required properties. Skipping.`);
                        continue;
                    }

                    interaction.client.commands.set(command.data.name, command);
                    console.log(`Reloaded command: ${command.data.name}`);
                } catch (error) {
                    console.error(`[ERROR] Failed to reload command ${file}:`, error);
                }
            }

            // Delete all existing commands
            const existingCommands = await interaction.client.application.commands.fetch();
            console.log(`Found ${existingCommands.size} existing commands to delete`);
            
            for (const command of existingCommands.values()) {
                await command.delete();
                console.log(`Deleted command: ${command.name}`);
            }

            // Register the refreshed commands
            const commands = [];
            for (const command of interaction.client.commands.values()) {
                commands.push(command.data.toJSON());
            }

            try {
                await interaction.client.application.commands.set(commands);
                await interaction.editReply({
                    content: '✅ Commands reloaded successfully! The new commands should appear shortly.',
                    ephemeral: true
                });
            } catch (error) {
                console.error('Error registering reloaded commands:', error);
                await interaction.editReply({
                    content: '❌ Failed to register reloaded commands. Please try using `/restart` instead.',
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in reload command:', error);
            try {
                await interaction.editReply({
                    content: `❌ Error reloading command: ${error.message}`,
                    ephemeral: true
                });
            } catch (replyError) {
                console.error('Failed to send error message:', replyError);
            }
        }
    }
}; 