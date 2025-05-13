require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Check if we have the required environment variables
if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
    console.error('Missing required environment variables (DISCORD_TOKEN or CLIENT_ID)');
    process.exit(1);
}

// Specify your guild ID manually
const GUILD_ID = process.argv[2] || "484925421499187201";

console.log('Starting FORCE registration process...');
console.log(`Using guild ID: ${GUILD_ID}`);
console.log(`Using client ID: ${process.env.CLIENT_ID}`);

// Create REST instance
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function forceRegister() {
    try {
        // STEP 1: First clear all existing commands
        console.log(`\nSTEP 1: Clearing all existing commands from guild ${GUILD_ID}...`);
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, GUILD_ID),
            { body: [] }
        );
        console.log('✅ All existing commands cleared successfully');

        // STEP 2: Load all command files
        console.log('\nSTEP 2: Loading command files...');
        const commands = [];
        const commandsPath = path.join(__dirname, 'src', 'commands');
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            try {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);

                // Validate command structure
                if (!command.data || !command.data.toJSON) {
                    console.warn(`⚠️ The command at ${file} is missing required properties. Skipping.`);
                    continue;
                }

                // Add command to array
                commands.push(command.data.toJSON());
                console.log(`✅ Loaded command: ${command.data.name}`);
            } catch (error) {
                console.error(`❌ Failed to load command ${file}:`, error);
            }
        }

        console.log(`Total commands loaded: ${commands.length}`);

        // STEP 3: Register all commands
        console.log(`\nSTEP 3: Registering ${commands.length} commands to guild ${GUILD_ID}...`);
        const response = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        
        console.log(`✅ Successfully registered ${response.length} commands!`);
        console.log('\nRegistered commands:');
        if (response.length > 0) {
            response.forEach(cmd => {
                console.log(`- ${cmd.name}: ${cmd.id}`);
            });
        }

        console.log('\n🎉 Force registration complete! Commands should be available in Discord shortly.');
        console.log('If commands still don\'t work, you may need to reinvite the bot with the correct permissions.');
    } catch (error) {
        console.error('Error during force registration:', error);
        
        if (error.code === 50001) {
            console.error('\n❌ MISSING ACCESS ERROR: The bot doesn\'t have permission to manage commands.');
            console.log('\nPossible solutions:');
            console.log('1. Reinvite the bot using the invite link from generate-invite.js');
            console.log('2. Make sure the bot has the "applications.commands" scope');
            console.log('3. Make sure the bot has administrator permissions in your server');
        }
    }
}

// Run the force registration
forceRegister(); 