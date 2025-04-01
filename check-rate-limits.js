// Script to check Discord API rate limits
const path = require('path');
// Load environment variables from .env file - make sure path is correct
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Debug line to check if environment variables are loaded
console.log('Environment variables loaded. TOKEN exists:', !!process.env.DISCORD_TOKEN);
console.log('Actual value length:', process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.length : 0);

const https = require('https');

// Check if guild ID is provided
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error('Usage: node check-rate-limits.js <guildId>');
    process.exit(1);
}

const guildId = args[0];
console.log(`Checking rate limits for guild: ${guildId}`);

// Validate environment variables
if (!process.env.DISCORD_TOKEN) {
    console.error('Missing DISCORD_TOKEN environment variable');
    process.exit(1);
}

if (!process.env.CLIENT_ID) {
    console.error('Missing CLIENT_ID environment variable');
    process.exit(1);
}

async function checkRateLimits() {
    try {
        const checkRateLimit = () => {
            return new Promise((resolve, reject) => {
                const options = {
                    hostname: 'discord.com',
                    port: 443,
                    path: `/api/v10/applications/${process.env.CLIENT_ID}/guilds/${guildId}/commands`,
                    method: 'GET',
                    headers: {
                        'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
                        'User-Agent': 'DiscordBot (https://github.com/streakwiz, 1.0.0)',
                        'Content-Type': 'application/json'
                    }
                };
                
                console.log('Making API request to check rate limits...');
                const req = https.request(options, (res) => {
                    let data = '';
                    
                    // Get all the rate limit headers
                    const rateLimit = {
                        limit: res.headers['x-ratelimit-limit'],
                        remaining: res.headers['x-ratelimit-remaining'],
                        reset: res.headers['x-ratelimit-reset'],
                        resetAfter: res.headers['x-ratelimit-reset-after'],
                        bucket: res.headers['x-ratelimit-bucket'],
                        global: res.headers['x-ratelimit-global'],
                        scope: res.headers['x-ratelimit-scope']
                    };
                    
                    res.on('data', (chunk) => {
                        data += chunk;
                    });
                    
                    res.on('end', () => {
                        resolve({
                            statusCode: res.statusCode,
                            headers: rateLimit,
                            data: data
                        });
                    });
                });
                
                req.on('error', (e) => {
                    reject(e);
                });
                
                req.end();
            });
        };
        
        const rateLimitInfo = await checkRateLimit();
        
        console.log('API Response Status:', rateLimitInfo.statusCode);
        
        if (rateLimitInfo.statusCode === 429) {
            // We're definitely rate limited
            console.log('\n⚠️ RATE LIMITED! ⚠️\n');
            let retryAfter = 0;
            try {
                const responseData = JSON.parse(rateLimitInfo.data);
                retryAfter = responseData.retry_after || 0;
                console.log('Response data:', responseData);
            } catch (e) {
                console.error('Error parsing rate limit response:', e);
            }
            
            console.log(`Please wait ${retryAfter} seconds before trying again.`);
            return;
        }
        
        // Check if we're close to rate limits
        const headers = rateLimitInfo.headers;
        console.log('\nRate Limit Headers:');
        console.log(JSON.stringify(headers, null, 2));
        
        const remaining = parseInt(headers.remaining) || 0;
        const limit = parseInt(headers.limit) || 5;
        const resetAfter = parseInt(headers.resetAfter) || 0;
        
        let status = "✅ Good";
        if (remaining === 0) {
            status = "❌ Rate Limited";
        } else if (remaining < limit * 0.2) {
            status = "⚠️ Near Limit";
        }
        
        const resetDate = new Date(Date.now() + (resetAfter * 1000));
        
        console.log('\nRate Limit Summary:');
        console.log(`Status: ${status}`);
        console.log(`Remaining Requests: ${remaining}/${limit}`);
        console.log(`Reset After: ${resetAfter} seconds`);
        console.log(`Reset Time: ${resetDate.toLocaleTimeString()}`);
        
        try {
            // Also check current commands
            const commands = JSON.parse(rateLimitInfo.data);
            console.log(`\nCurrent Commands (${commands.length}):`);
            for (const cmd of commands) {
                console.log(`- ${cmd.name}`);
            }
        } catch (e) {
            console.error('Error parsing commands response:', e);
        }
    } catch (error) {
        console.error('Error checking rate limits:', error);
    }
}

// Run the check
checkRateLimits(); 