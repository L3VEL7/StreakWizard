// Script to force Discord to refresh its cache
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
    console.error('DISCORD_TOKEN not found in .env file');
    process.exit(1);
}

console.log('Starting bot to refresh guild cache...');

// Create a new client instance
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ] 
});

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    // Fetch guilds
    console.log('Fetching guilds...');
    const guilds = await client.guilds.fetch();
    console.log(`Bot is in ${guilds.size} guilds:`);
    
    // List guilds
    for (const [id, guild] of guilds) {
        try {
            const fullGuild = await guild.fetch();
            console.log(`- ${fullGuild.name} (${id})`);
        } catch (error) {
            console.log(`- Unknown guild (${id}) - Could not fetch: ${error.message}`);
        }
    }
    
    console.log('\nRefresh completed. Shutting down...');
    client.destroy();
    process.exit(0);
});

// Login to Discord
client.login(TOKEN); 