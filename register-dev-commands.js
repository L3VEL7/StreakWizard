/**
 * Development Command Registration Script
 * 
 * This script registers commands to a specific test guild for faster development testing.
 * Guild commands update instantly, unlike global commands which take up to an hour.
 * 
 * Usage:
 * 1. Set your Discord token in .env file (DISCORD_TOKEN=your_token)
 * 2. Set your test guild ID when running: 
 *    node register-dev-commands.js YOUR_GUILD_ID
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Get guild ID from command line
const guildId = process.argv[2];
if (!guildId) {
    console.error('Please provide a guild ID as a command line argument');
    console.error('Usage: node register-dev-commands.js YOUR_GUILD_ID');
    process.exit(1);
}

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
console.log(`Registering to guild ID: ${guildId}`);

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

// Function to register commands
async function registerCommands() {
    try {
        // Clear existing guild commands
        console.log(`Clearing existing commands from guild ${guildId}...`);
        await rest.put(
            Routes.applicationGuildCommands(applicationId, guildId),
            { body: [] }
        );
        console.log('✅ Existing guild commands cleared');
        
        // Register commands to the guild
        console.log(`Registering ${commands.length} commands to guild ${guildId}...`);
        await rest.put(
            Routes.applicationGuildCommands(applicationId, guildId),
            { body: commands }
        );
        console.log('✅ All commands registered to guild successfully');
        console.log('\n📢 Commands should be available immediately for testing');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

// Run the command registration
registerCommands(); 