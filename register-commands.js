// Script to manually register commands to a specific guild
const path = require('path');
// Load environment variables from .env file - make sure path is correct
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Debug line to check if environment variables are loaded
console.log('Environment variables loaded. TOKEN exists:', !!process.env.DISCORD_TOKEN);
console.log('Environment variables loaded. CLIENT_ID exists:', !!process.env.CLIENT_ID);

const fs = require('fs');
const { REST, Routes } = require('discord.js');

// Check if guild ID is provided
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error('Usage: node register-commands.js <guildId>');
    process.exit(1);
}

const guildId = args[0];
console.log(`Attempting to register commands to guild: ${guildId}`);

// Validate environment variables
if (!process.env.DISCORD_TOKEN) {
    console.error('Missing DISCORD_TOKEN environment variable');
    process.exit(1);
}

async function registerCommands() {
    try {
        // Load command files
        const commands = [];
        const commandsPath = path.join(__dirname, 'src', 'commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            try {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);

                // Validate command structure
                if (!command.data || !command.data.name || !command.execute) {
                    console.warn(`[WARNING] The command at ${file} is missing required properties. Skipping.`);
                    continue;
                }

                // Add command to array
                commands.push(command.data.toJSON());
                console.log(`Loaded command: ${command.data.name}`);
            } catch (error) {
                console.error(`[ERROR] Failed to load command ${file}:`, error);
            }
        }

        console.log(`Loaded ${commands.length} commands.`);

        // Setup REST API client
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        // First clear existing commands
        console.log(`Clearing existing commands in guild ${guildId}...`);
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID || 'MISSING_CLIENT_ID', guildId),
            { body: [] }
        );
        console.log('Existing commands cleared.');

        // Register commands
        console.log(`Registering ${commands.length} commands to guild ${guildId}...`);
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID || 'MISSING_CLIENT_ID', guildId),
            { body: commands }
        );
        console.log(`Successfully registered ${data.length} guild commands!`);
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

// Add delay to avoid rate limits
console.log('Starting registration with 2-second delay...');
setTimeout(() => {
    registerCommands();
}, 2000); 