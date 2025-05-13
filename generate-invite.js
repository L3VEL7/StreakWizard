require('dotenv').config();

// Get client ID from environment variables
const clientId = process.env.CLIENT_ID;

if (!clientId) {
    console.error('Error: CLIENT_ID is not set in the .env file');
    process.exit(1);
}

// Required permissions:
// - Manage Server: For guild-related settings
// - Send Messages: To respond to commands
// - Embed Links: For rich embeds
// - Read Message History: To track messages
// - Use Application Commands: For slash commands

const permissions = [
    'MANAGE_GUILD',
    'SEND_MESSAGES',
    'EMBED_LINKS',
    'READ_MESSAGE_HISTORY',
    'USE_APPLICATION_COMMANDS'
].join('%20');

// Include both bot and applications.commands scopes
const scopes = ['bot', 'applications.commands'].join('%20');

// Generate the invite URL
const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&scope=${scopes}&permissions=8`;

console.log('\n=== Bot Invite Link ===\n');
console.log(inviteUrl);
console.log('\nUse this link to invite the bot to your server with the correct permissions');
console.log('This link includes the applications.commands scope, which is required for slash commands');
console.log('\nAfter adding the bot to your server, use one of the registration scripts to register the commands'); 