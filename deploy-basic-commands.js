// Script to deploy just basic ping and help commands
const https = require('https');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.argv[2]; // Accept guild ID as parameter

if (!TOKEN || !CLIENT_ID) {
    console.error('DISCORD_TOKEN or CLIENT_ID not found in .env file');
    process.exit(1);
}

if (!GUILD_ID) {
    console.error('Please provide a GUILD_ID as a command line argument');
    console.error('Usage: node deploy-basic-commands.js GUILD_ID');
    process.exit(1);
}

console.log('Using TOKEN: ****' + TOKEN.substring(TOKEN.length - 5));
console.log('Using CLIENT_ID:', CLIENT_ID);
console.log('Using GUILD_ID:', GUILD_ID);

// Basic command definitions - hardcoded to avoid any loading issues
const commands = [
    {
        name: 'ping',
        description: 'Replies with Pong!'
    },
    {
        name: 'help',
        description: 'Shows help information'
    }
];

console.log('Using hardcoded commands:', commands.map(cmd => cmd.name).join(', '));

// Function to make HTTPS requests to Discord API
function makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'discord.com',
            port: 443,
            path: `/api/v10${path}`,
            method: method,
            headers: {
                'Authorization': `Bot ${TOKEN}`,
                'User-Agent': 'DiscordBot (https://github.com/streakwiz, 1.0.0)',
                'Content-Type': 'application/json'
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
        
        if (body) {
            req.write(JSON.stringify(body));
        }
        
        req.end();
    });
}

async function deployBasicCommands() {
    try {
        // Clear existing commands
        console.log(`Clearing existing commands in guild ${GUILD_ID}...`);
        await makeRequest('PUT', `/applications/${CLIENT_ID}/guilds/${GUILD_ID}/commands`, []);
        console.log('Existing commands cleared.');
        
        // Register new commands
        console.log(`Registering ${commands.length} basic commands...`);
        const result = await makeRequest('PUT', `/applications/${CLIENT_ID}/guilds/${GUILD_ID}/commands`, commands);
        
        if (Array.isArray(result)) {
            console.log(`✅ Successfully registered ${result.length} commands!`);
            result.forEach(cmd => {
                console.log(`- ${cmd.name}: ${cmd.id}`);
            });
        } else {
            console.log('Unexpected result format:', result);
        }
        
        console.log('\nBasic commands deployed. Check Discord in a few minutes.');
    } catch (error) {
        console.error('Error deploying commands:', error);
    }
}

// Execute the function
deployBasicCommands(); 