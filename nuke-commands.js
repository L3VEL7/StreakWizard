// Script to completely remove all commands from Discord 
// This uses bare HTTP requests to ensure it works even if Discord.js has issues
const https = require('https');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
if (!TOKEN || !CLIENT_ID) {
    console.error('DISCORD_TOKEN or CLIENT_ID not found in .env file');
    process.exit(1);
}

console.log('Using TOKEN: ****' + TOKEN.substring(TOKEN.length - 5));
console.log('Using CLIENT_ID:', CLIENT_ID);

// Function to make HTTPS requests to Discord API
function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const bodyData = body !== null ? JSON.stringify(body) : '';
        
        const options = {
            hostname: 'discord.com',
            port: 443,
            path: `/api/v10${path}`,
            method: method,
            headers: {
                'Authorization': `Bot ${TOKEN}`,
                'User-Agent': 'DiscordBot (https://github.com/streakwiz, 1.0.0)',
                'Content-Type': 'application/json',
                'Content-Length': bodyData.length
            }
        };
        
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(data ? JSON.parse(data) : {});
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    console.error(`API error (${res.statusCode}):`, data);
                    reject(new Error(`API error: ${res.statusCode}`));
                }
            });
        });
        
        req.on('error', (e) => {
            reject(e);
        });
        
        if (bodyData) {
            req.write(bodyData);
        }
        
        req.end();
    });
}

async function nukeAllCommands() {
    try {
        // Step 1: Get the bot's guilds
        console.log('Fetching guilds...');
        const guilds = await makeRequest('GET', '/users/@me/guilds');
        
        if (!guilds || !Array.isArray(guilds)) {
            console.error('Failed to fetch guilds:', guilds);
            return;
        }
        
        console.log(`Bot is in ${guilds.length} guilds`);
        
        // Step 2: For each guild, delete all commands
        for (const guild of guilds) {
            try {
                console.log(`Clearing commands from guild: ${guild.name} (${guild.id})...`);
                await makeRequest('PUT', `/applications/${CLIENT_ID}/guilds/${guild.id}/commands`, []);
                console.log(`✅ Commands cleared from guild: ${guild.name} (${guild.id})`);
            } catch (error) {
                console.error(`Error clearing commands from guild ${guild.name}:`, error.message);
            }
        }
        
        // Step 3: Clear global commands
        console.log('Clearing global commands...');
        await makeRequest('PUT', `/applications/${CLIENT_ID}/commands`, []);
        console.log('✅ Global commands cleared');
        
        console.log('\nAll commands have been nuked from Discord.');
    } catch (error) {
        console.error('Error nuking commands:', error);
    }
}

// Execute the function
nukeAllCommands(); 