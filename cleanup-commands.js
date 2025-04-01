/**
 * Command Cleanup Script
 * 
 * This script completely cleans up all commands - both global and guild specific.
 * Use this to fix duplicate command issues.
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { Client, GatewayIntentBits } = require('discord.js');

// Validate token
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ Missing DISCORD_TOKEN environment variable');
    process.exit(1);
}

// Initialize REST client
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Extract application ID from token
const TOKEN_REGEX = /^([^\.]+)\.([^\.]+)\./;
const match = TOKEN_REGEX.exec(process.env.DISCORD_TOKEN);
if (!match) {
    console.error('❌ Invalid Discord token format');
    process.exit(1);
}
const applicationId = Buffer.from(match[1], 'base64').toString();
console.log(`Using application ID: ${applicationId}`);

// Create Discord client
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

async function cleanupCommands() {
    try {
        console.log('🔄 Logging in to Discord...');
        await client.login(process.env.DISCORD_TOKEN);
        console.log(`✅ Logged in as ${client.user.tag}`);
        
        console.log('\n⌛ Starting command cleanup...');
        
        // Step 1: Clear all global commands
        console.log('\n🧹 Clearing global commands...');
        await rest.put(
            Routes.applicationCommands(applicationId),
            { body: [] }
        );
        console.log('✅ All global commands cleared successfully');
        
        // Step 2: Fetch all guilds the bot is in
        console.log('\n📋 Fetching guild list...');
        const guilds = await client.guilds.fetch();
        console.log(`ℹ️ Bot is in ${guilds.size} guilds`);
        
        // Step 3: Clear guild-specific commands for each guild
        console.log('\n🧹 Clearing guild-specific commands...');
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const [guildId, guild] of guilds) {
            try {
                console.log(`   Clearing commands from guild: ${guild.name} (${guildId})`);
                await rest.put(
                    Routes.applicationGuildCommands(applicationId, guildId),
                    { body: [] }
                );
                console.log(`   ✅ Commands cleared from ${guild.name}`);
                successCount++;
            } catch (error) {
                console.error(`   ❌ Error clearing commands from ${guild.name}: ${error.message}`);
                errorCount++;
            }
        }
        
        console.log('\n📊 Cleanup Results:');
        console.log(`   Guilds processed successfully: ${successCount}`);
        console.log(`   Guilds with errors: ${errorCount}`);
        
        console.log('\n✅ Command cleanup complete!');
        console.log('🔔 Now restart your bot for the changes to take effect.');
        console.log('   Commands will be registered based on your DEV_MODE setting.');
        
    } catch (error) {
        console.error('❌ Error during command cleanup:', error);
    } finally {
        // Always disconnect the client
        client.destroy();
        process.exit(0);
    }
}

// Run the cleanup
cleanupCommands(); 