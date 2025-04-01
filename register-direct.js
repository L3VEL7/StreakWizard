// Script to manually register commands to a specific guild
// This version takes command line arguments instead of reading from .env
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

// Check if required arguments are provided
const args = process.argv.slice(2);
if (args.length < 3) {
    console.error('Usage: node register-direct.js <DISCORD_TOKEN> <CLIENT_ID> <GUILD_ID>');
    process.exit(1);
}

const TOKEN = args[0];
const CLIENT_ID = args[1];
const GUILD_ID = args[2];

console.log(`Using TOKEN: ****${TOKEN.substring(TOKEN.length - 5)}`);
console.log(`Using CLIENT_ID: ${CLIENT_ID}`);
console.log(`Registering to GUILD_ID: ${GUILD_ID}`);

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
        const rest = new REST({ version: '10' }).setToken(TOKEN);

        // First clear existing commands
        console.log(`Clearing existing commands in guild ${GUILD_ID}...`);
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: [] }
        );
        console.log('Existing commands cleared.');

        // Register commands
        console.log(`Registering ${commands.length} commands to guild ${GUILD_ID}...`);
        const data = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log(`Successfully registered ${data.length} guild commands!`);
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

// Register commands
let timeout;
try {
    console.log('Starting command registration with 30-second timeout...');
    timeout = setTimeout(() => {
        console.log('⚠️ Command registration timed out, but commands may still be registering in the background.');
        console.log('Check Discord in a few minutes to see if commands appear.');
        process.exit(0);
    }, 30000);
    
    await registerCommands();
    clearTimeout(timeout);
    console.log('✅ Command registration completed successfully!');
} catch (error) {
    clearTimeout(timeout);
    console.error('Error during command registration:', error);
} 