const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { REST, Routes } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('registercommand')
        .setDescription('Register a specific command to this guild')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => 
            option.setName('commandname')
                .setDescription('The name of the command to register')
                .setRequired(true)),
    
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
            const commandName = interaction.options.getString('commandname').toLowerCase();
            
            // Find the command in the client's commands collection
            const command = interaction.client.commands.get(commandName);
            
            if (!command) {
                return await interaction.editReply({
                    content: `❌ Command "${commandName}" not found. Check the spelling and try again.`,
                    ephemeral: true
                });
            }
            
            // Convert the command to JSON for registration
            const commandData = command.data.toJSON();
            
            await interaction.editReply({
                content: `🔄 Attempting to register command "${commandName}" to this guild...`,
                ephemeral: true
            });
            
            // Set up REST API client
            const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
            
            try {
                // Register just this command to the guild
                await rest.put(
                    Routes.applicationGuildCommands(interaction.client.user.id, interaction.guild.id),
                    { body: [commandData] }
                );
                
                await interaction.editReply({
                    content: `✅ Successfully registered command "${commandName}" to this server!`,
                    ephemeral: true
                });
            } catch (error) {
                console.error(`Error registering command ${commandName}:`, error);
                
                await interaction.editReply({
                    content: `❌ Error registering command: ${error.message}\n\n**Command data:**\n\`\`\`json\n${JSON.stringify(commandData, null, 2)}\n\`\`\``,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('Error in registercommand:', error);
            await interaction.editReply({
                content: `❌ An error occurred: ${error.message}`,
                ephemeral: true
            });
        }
    },
}; 