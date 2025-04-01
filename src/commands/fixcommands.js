const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { REST, Routes } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fixcommands')
        .setDescription('Fix slash command registration issues')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    guildOnly: true,

    async execute(interaction) {
        // Check if this is in a guild
        if (!interaction.guild) {
            return await interaction.reply({
                content: '❌ This command can only be used in a server, not in DMs.',
                ephemeral: true
            });
        }
        
        // Check for administrator permissions safely
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            // First, acknowledge the command
            await interaction.editReply({
                content: '🔧 Attempting to fix command registration issues...',
                ephemeral: true
            });

            const commands = [];
            for (const command of interaction.client.commands.values()) {
                commands.push(command.data.toJSON());
            }

            const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

            // Clear this guild's commands first
            try {
                await interaction.editReply({
                    content: '🧹 Clearing guild commands...',
                    ephemeral: true
                });
                
                await rest.put(
                    Routes.applicationGuildCommands(interaction.client.user.id, interaction.guildId),
                    { body: [] }
                );
                
                await interaction.editReply({
                    content: '✅ Guild commands cleared. Now registering commands again...',
                    ephemeral: true
                });
            } catch (clearError) {
                console.error('Error clearing guild commands:', clearError);
                await interaction.editReply({
                    content: `❌ Error clearing guild commands: ${clearError.message}`,
                    ephemeral: true
                });
                return;
            }

            // Now register commands to this guild
            try {
                await rest.put(
                    Routes.applicationGuildCommands(interaction.client.user.id, interaction.guildId),
                    { body: commands }
                );
                
                await interaction.editReply({
                    content: `✅ Successfully registered ${commands.length} commands to this server!`,
                    ephemeral: true
                });
            } catch (registerError) {
                console.error('Error registering guild commands:', registerError);
                await interaction.editReply({
                    content: `❌ Error registering guild commands: ${registerError.message}`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error fixing commands:', error);
            await interaction.editReply({
                content: `❌ An error occurred: ${error.message}`,
                ephemeral: true
            });
        }
    },
}; 