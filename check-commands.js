require('dotenv').config();
const { REST, Routes } = require('discord.js');

// Check if we have the required environment variables
if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
    console.error('Missing required environment variables (DISCORD_TOKEN or CLIENT_ID)');
    process.exit(1);
}

console.log('=== COMMAND CHECKER ===');

// Create REST instance
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Specify your guild ID manually
const GUILD_ID = process.argv[2] || "484925421499187201";

async function checkCommands() {
    try {
        console.log('Checking global commands...');
        const globalCommands = await rest.get(
            Routes.applicationCommands(process.env.CLIENT_ID)
        );
        
        console.log(`\nFound ${globalCommands.length} global commands:`);
        if (globalCommands.length > 0) {
            globalCommands.forEach(cmd => {
                console.log(`- ${cmd.name}: ${cmd.id}`);
                
                // Print options if they exist
                if (cmd.options && cmd.options.length > 0) {
                    console.log(`  Options: ${cmd.options.map(opt => 
                        `${opt.name}${opt.required ? ' (required)' : ''}`
                    ).join(', ')}`);
                } else {
                    console.log('  No options');
                }
            });
        }
        
        console.log(`\nChecking guild commands for ${GUILD_ID}...`);
        const guildCommands = await rest.get(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, GUILD_ID)
        );
        
        console.log(`\nFound ${guildCommands.length} guild commands:`);
        if (guildCommands.length > 0) {
            guildCommands.forEach(cmd => {
                console.log(`- ${cmd.name}: ${cmd.id}`);
                
                // Print options if they exist
                if (cmd.options && cmd.options.length > 0) {
                    console.log(`  Options: ${cmd.options.map(opt => 
                        `${opt.name}${opt.required ? ' (required)' : ''}`
                    ).join(', ')}`);
                } else {
                    console.log('  No options');
                }
            });
        }
        
        console.log('\nCommand check complete!');
    } catch (error) {
        console.error('Error checking commands:', error);
        
        if (error.code === 50001) {
            console.error('\nMISSING ACCESS ERROR: The bot doesn\'t have permission to check commands.');
            console.log('\nPossible solutions:');
            console.log('1. Make sure the bot has the "applications.commands" scope');
            console.log('2. Make sure the bot has appropriate permissions');
        }
    }
}

// Run the check
checkCommands(); 