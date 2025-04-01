const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggledevmode')
        .setDescription('Toggle between development and production mode')
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
            // Load current .env file
            const envPath = path.resolve(process.cwd(), '.env');
            let envContent = '';
            
            try {
                envContent = fs.readFileSync(envPath, 'utf8');
            } catch (readError) {
                console.error('Error reading .env file:', readError);
                return await interaction.editReply({
                    content: '❌ Could not read environment configuration.',
                    ephemeral: true
                });
            }

            // Check current DEV_MODE setting
            const currentMode = process.env.DEV_MODE === 'true';
            const newMode = !currentMode;
            
            // Update .env file
            let updatedContent;
            if (envContent.includes('DEV_MODE=')) {
                updatedContent = envContent.replace(
                    /DEV_MODE=(true|false)/,
                    `DEV_MODE=${newMode}`
                );
            } else {
                updatedContent = envContent + `\nDEV_MODE=${newMode}`;
            }
            
            // Write updated .env file
            fs.writeFileSync(envPath, updatedContent);
            
            // Update process environment
            process.env.DEV_MODE = newMode.toString();
            
            await interaction.editReply({
                content: `✅ Mode switched to ${newMode ? '**DEVELOPMENT**' : '**PRODUCTION**'} mode.\n\n${
                    newMode 
                        ? '⚠️ Commands will now be registered per guild for faster updates.' 
                        : '🌐 Commands will now be registered globally (may take up to an hour to update).'
                }\n\n**Note:** You need to restart the bot for this change to take effect.`,
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Error toggling dev mode:', error);
            await interaction.editReply({
                content: `❌ An error occurred: ${error.message}`,
                ephemeral: true
            });
        }
    },
}; 