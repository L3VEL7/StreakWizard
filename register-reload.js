require('dotenv').config();
const { REST, Routes } = require('discord.js');

// Check if we have the required environment variables
if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
    console.error('Missing required environment variables (DISCORD_TOKEN or CLIENT_ID)');
    process.exit(1);
}

// Specify your guild ID manually
const GUILD_ID = process.argv[2] || "484925421499187201";

// Only register the reload command
const commands = [
    {
        name: 'reload',
        description: 'Reloads a command',
        default_member_permissions: "8", // Administrator permission (8)
        options: [
            {
                name: 'command',
                description: 'The command to reload',
                type: 3, // STRING type
                required: true,
                autocomplete: true
            }
        ]
    },
    {
        name: 'resetdata',
        description: 'Reset all streaks and trigger words for this server',
        default_member_permissions: "8", // Administrator permission (8)
        options: [
            {
                name: 'confirm',
                description: 'Confirm that you want to reset all data',
                type: 5, // BOOLEAN type
                required: true
            }
        ]
    }
];

// Create REST instance
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Register commands function
async function registerCommands() {
    try {
        console.log(`Registering ${commands.length} commands to guild ${GUILD_ID}...`);
        
        // Register commands to the guild
        const response = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        
        console.log(`Successfully registered ${response.length} commands!`);
        if (response.length > 0) {
            response.forEach(cmd => {
                console.log(`- ${cmd.name}: ${cmd.id}`);
            });
        }
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

// Run the registration
registerCommands(); 