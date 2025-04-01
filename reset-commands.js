/**
 * Reset Discord Commands Script
 * 
 * This script will:
 * 1. Clear all global commands
 * 2. Clear all guild-specific commands
 * 3. Re-register all commands globally
 * 
 * Use this script to fix "Unknown Integration" errors that occur when
 * there are duplicate or conflicting command registrations.
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

if (!process.env.DISCORD_TOKEN) {
    console.error('Missing DISCORD_TOKEN environment variable');
    process.exit(1);
}

// Initialize REST client
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Get application ID from token
const TOKEN_REGEX = /^([^\.]+)\.([^\.]+)\./;
const match = TOKEN_REGEX.exec(process.env.DISCORD_TOKEN);
if (!match) {
    console.error('Invalid Discord token format');
    process.exit(1);
}
const applicationId = Buffer.from(match[1], 'base64').toString();
console.log(`Using application ID: ${applicationId}`);

// Load command files
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Load commands
const commands = [];
console.log('Loading commands:');
for (const file of commandFiles) {
    try {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if (!command.data || !command.data.toJSON) {
            console.warn(`[WARNING] The command at ${file} is missing required properties. Skipping.`);
            continue;
        }
        
        commands.push(command.data.toJSON());
        console.log(`- Loaded ${command.data.name}`);
    } catch (error) {
        console.error(`[ERROR] Failed to load command ${file}:`, error);
    }
}

// Function to reset commands
async function resetCommands() {
    try {
        // Step 1: Clear all global commands
        console.log('Clearing all global commands...');
        await rest.put(
            Routes.applicationCommands(applicationId),
            { body: [] }
        );
        console.log('✅ All global commands cleared successfully');
        
        // Step 2: Register all commands globally
        console.log(`Registering ${commands.length} commands globally...`);
        await rest.put(
            Routes.applicationCommands(applicationId),
            { body: commands }
        );
        console.log('✅ All commands registered globally');
        
        console.log('\n📢 Command reset complete!');
        console.log('It may take up to 1 hour for the changes to fully propagate through Discord\'s systems.');

    } catch (error) {
        console.error('Error resetting commands:', error);
    }
}

// Run the command reset
resetCommands(); 