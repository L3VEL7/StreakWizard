// Simple script to register commands with timeout
const fs = require('fs');
const path = require('path');
const { REST } = require('discord.js');
const { Routes } = require('discord.js');

// Check arguments
const args = process.argv.slice(2);
if (args.length < 3) {
    console.error('Usage: node register-simple.cjs <TOKEN> <CLIENT_ID> <GUILD_ID>');
    process.exit(1);
}

const TOKEN = args[0];
const CLIENT_ID = args[1];
const GUILD_ID = args[2];

console.log('Using TOKEN: ****' + TOKEN.substring(TOKEN.length - 5));
console.log('Using CLIENT_ID:', CLIENT_ID);
console.log('Using GUILD_ID:', GUILD_ID);

// Function to register commands
async function registerCommands() {
    try {
        // Load command files
        const commands = [];
        const commandsPath = path.join(__dirname, 'src', 'commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            try {
                const command = require(path.join(commandsPath, file));
                if (command.data && command.data.name) {
                    commands.push(command.data.toJSON());
                    console.log(`Loaded command: ${command.data.name}`);
                }
            } catch (error) {
                console.error(`Error loading command ${file}:`, error.message);
            }
        }

        console.log(`Loaded ${commands.length} commands`);

        // Set up REST client
        const rest = new REST({ version: '10' }).setToken(TOKEN);

        // Clear existing commands first
        console.log(`Clearing commands from guild ${GUILD_ID}...`);
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: [] }
        );
        console.log('Commands cleared');

        // Register new commands
        console.log(`Registering ${commands.length} commands...`);
        const result = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log(`Successfully registered ${result.length} commands!`);
        return result;
    } catch (error) {
        console.error('Error during registration:', error.message);
        throw error;
    }
}

// Set timeout
const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Registration timed out')), 30000);
});

// Race between registration and timeout
Promise.race([registerCommands(), timeoutPromise])
    .then(result => {
        console.log('Registration completed successfully!');
        process.exit(0);
    })
    .catch(error => {
        if (error.message === 'Registration timed out') {
            console.log('⚠️ Command registration timed out, but might still be processing.');
            console.log('Check Discord in a few minutes to see if commands appear.');
        } else {
            console.error('Error during registration:', error.message);
        }
        process.exit(1);
    }); 