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

            // Get all commands
            const commands = [];
            for (const command of interaction.client.commands.values()) {
                commands.push(command.data.toJSON());
            }

            const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

            try {
                // Step 1: Get the current commands to see if they're already registered
                await interaction.editReply({
                    content: '🔍 Checking current guild commands...',
                    ephemeral: true
                });
                
                const existingCommands = await rest.get(
                    Routes.applicationGuildCommands(interaction.client.user.id, interaction.guildId)
                ).catch(e => {
                    console.error('Error fetching guild commands:', e.message);
                    return [];
                });
                
                if (Array.isArray(existingCommands) && existingCommands.length > 0) {
                    await interaction.editReply({
                        content: `📊 Found ${existingCommands.length} existing commands in this guild.`,
                        ephemeral: true
                    });
                } else {
                    await interaction.editReply({
                        content: `⚠️ No existing commands found in this guild.`,
                        ephemeral: true
                    });
                }
                
                // Step 2: Clear this guild's commands
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
                
                // Step 3: Register commands to this guild
                await interaction.editReply({
                    content: `🔄 Registering ${commands.length} commands to this server...`,
                    ephemeral: true
                });
                
                await rest.put(
                    Routes.applicationGuildCommands(interaction.client.user.id, interaction.guildId),
                    { body: commands }
                );
                
                // Final confirmation
                await interaction.editReply({
                    content: `✅ Successfully registered ${commands.length} commands to this server!\n\nIf commands are still not showing up:\n- The bot may need additional permissions\n- Try restarting your Discord client\n- The commands tab might need time to update`,
                    ephemeral: true
                });
                
            } catch (apiError) {
                console.error('Discord API error:', apiError);
                await interaction.editReply({
                    content: `❌ Discord API error: ${apiError.message}\n\nThis might be due to rate limiting or permission issues. Try again in a few minutes.`,
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