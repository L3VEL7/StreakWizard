const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { REST, Routes } = require('discord.js');
const https = require('https');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ratelimit')
        .setDescription('Check Discord API rate limits')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    guildOnly: true,

    async execute(interaction) {
        if (!interaction.guild) {
            return await interaction.reply({
                content: '❌ This command can only be used in a server, not in DMs.',
                ephemeral: true
            });
        }
        
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            return await interaction.reply({
                content: '❌ You need administrator permissions to use this command.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            await interaction.editReply({
                content: '🔍 Checking Discord API rate limits...',
                ephemeral: true
            });

            const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
            
            // Make a simple API request to check headers
            const checkRateLimit = () => {
                return new Promise((resolve, reject) => {
                    const options = {
                        hostname: 'discord.com',
                        port: 443,
                        path: `/api/v10/applications/${interaction.client.user.id}/guilds/${interaction.guild.id}/commands`,
                        method: 'GET',
                        headers: {
                            'Authorization': `Bot ${process.env.DISCORD_TOKEN}`,
                            'User-Agent': 'DiscordBot (https://github.com/streakwiz, 1.0.0)',
                            'Content-Type': 'application/json'
                        }
                    };
                    
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
            
            if (rateLimitInfo.statusCode === 429) {
                // We're definitely rate limited
                let retryAfter = 0;
                try {
                    const responseData = JSON.parse(rateLimitInfo.data);
                    retryAfter = responseData.retry_after || 0;
                } catch (e) {
                    console.error('Error parsing rate limit response:', e);
                }
                
                await interaction.editReply({
                    content: `⚠️ **RATE LIMITED!**\n\nDiscord is currently rate limiting the bot.\n\nPlease wait ${retryAfter} seconds before trying again.\n\nThis is why command registration is failing. Discord's rate limits are stricter when registering commands multiple times in a short period.`,
                    ephemeral: true
                });
                return;
            }
            
            // Check if we're close to rate limits
            const headers = rateLimitInfo.headers;
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
            
            await interaction.editReply({
                content: `**Discord API Rate Limit Check**\n\n` +
                         `Status: ${status}\n` +
                         `Remaining Requests: ${remaining}/${limit}\n` +
                         `Reset After: ${resetAfter} seconds\n` +
                         `Reset Time: ${resetDate.toLocaleTimeString()}\n\n` +
                         `If you're seeing rate limits, this is why command registration is getting stuck. Discord restricts how often you can register commands, especially if you've been deploying the bot frequently.`,
                ephemeral: true
            });
            
        } catch (error) {
            console.error('Error checking rate limits:', error);
            await interaction.editReply({
                content: `❌ Error checking rate limits: ${error.message}`,
                ephemeral: true
            });
        }
    },
}; 