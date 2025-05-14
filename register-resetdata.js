/**
 * This script only registers the resetdata command
 * Run this directly to make the command available:
 *   node register-resetdata.js
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const path = require('path');

// Check if we have the required environment variables
if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
    console.error('Missing required environment variables (DISCORD_TOKEN or CLIENT_ID)');
    process.exit(1);
}

// Specify guild ID from command line or use default
const GUILD_ID = process.argv[2] || "484925421499187201";

console.log('=== REGISTERING RESETDATA COMMAND ===');
console.log(`Guild ID: ${GUILD_ID}`);
console.log(`Client ID: ${process.env.CLIENT_ID}`);

// Create REST instance
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Register just the resetdata command
async function registerCommand() {
    try {
        // First, we'll try to load the command directly
        console.log('Loading resetdata command...');
        
        // Load the command from the file
        const commandPath = path.join(__dirname, 'src', 'commands', 'resetdata.js');
        const resetdataCommand = require(commandPath);
        
        if (!resetdataCommand.data || !resetdataCommand.data.toJSON) {
            console.error('❌ Command file does not have a valid structure');
            process.exit(1);
        }
        
        // Get the command data
        const commandData = resetdataCommand.data.toJSON();
        console.log(`Command loaded: ${commandData.name}`);
        
        // Log the command structure for debugging
        console.log('Command structure:');
        console.log(`- Name: ${commandData.name}`);
        console.log(`- Description: ${commandData.description}`);
        if (commandData.options) {
            console.log('- Options:');
            commandData.options.forEach(option => {
                console.log(`  * ${option.name} (${option.type}) - Required: ${option.required}`);
            });
        }
        
        // First, try to register it as a guild command
        console.log(`\nRegistering to guild ${GUILD_ID}...`);
        const guildResponse = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, GUILD_ID),
            { body: [commandData] }
        );
        
        if (guildResponse.length > 0) {
            console.log(`✅ Successfully registered as guild command: ${guildResponse[0].name} (${guildResponse[0].id})`);
        } else {
            console.warn('⚠️ Guild registration returned an empty response');
        }
        
        // Now also register it globally for good measure
        console.log('\nAlso registering globally (this may take up to an hour to propagate)...');
        const globalResponse = await rest.post(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commandData }
        );
        
        if (globalResponse && globalResponse.id) {
            console.log(`✅ Successfully registered as global command: ${globalResponse.name} (${globalResponse.id})`);
        } else {
            console.warn('⚠️ Global registration returned an unexpected response');
        }
        
        console.log('\n🎉 Command registration complete!');
        console.log('Guild command should be available immediately.');
        console.log('Global command may take up to an hour to be available in all servers.');
        
        return true;
    } catch (error) {
        console.error('Error registering command:', error);
        
        if (error.code === 50001) {
            console.error('\n❌ MISSING ACCESS ERROR: The bot doesn\'t have permission to manage commands');
            console.log('\nPossible solutions:');
            console.log('1. Reinvite the bot using the invite link with the applications.commands scope');
            console.log('2. Make sure the bot has the necessary permissions in your server');
        }
        
        return false;
    }
}

// Run the registration
registerCommand(); 